"""Inventory reservation, deduction, and release use cases."""

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.features.catalog.domain.ports import IStorefrontAvailabilityPort, IVariantSourcePort
from app.features.inventory.domain.entities import (
    InventoryReservation,
    InventoryReservationRequestLine,
    InventoryReservationStatus,
)
from app.features.inventory.domain.ports import IInventoryRepository


class InsufficientInventoryError(Exception):
    def __init__(self, variant_id: UUID, requested: int, available: int) -> None:
        super().__init__(
            f"Insufficient stock for variant {variant_id}: requested {requested}, available {available}"
        )
        self.variant_id = variant_id
        self.requested = requested
        self.available = available


class InventoryReservationMissingError(Exception):
    pass


class _ManualVariantSourcePort(IVariantSourcePort):
    async def is_erp_managed(self, variant_id: UUID) -> bool:
        return False


class _NoOpStorefrontAvailabilityPort(IStorefrontAvailabilityPort):
    async def apply_availability(self, variant_id: UUID, available: int) -> None:
        return None


class InventoryService:
    CHECKOUT_REFERENCE_TYPE = "checkout_session"

    def __init__(
        self,
        repo: IInventoryRepository,
        reservation_ttl: timedelta = timedelta(minutes=15),
        *,
        variant_source: IVariantSourcePort | None = None,
        storefront_availability: IStorefrontAvailabilityPort | None = None,
    ) -> None:
        self._repo = repo
        self._reservation_ttl = reservation_ttl
        self._variant_source = variant_source or _ManualVariantSourcePort()
        self._storefront = storefront_availability or _NoOpStorefrontAvailabilityPort()

    async def get_available_quantity(self, variant_id: UUID) -> int:
        return await self._repo.get_available_quantity(variant_id)

    async def ensure_available(self, variant_id: UUID, quantity: int) -> None:
        available = await self.get_available_quantity(variant_id)
        if available < quantity:
            raise InsufficientInventoryError(variant_id, quantity, available)

    async def reserve_checkout_session(
        self, checkout_session_id: UUID, lines: list[InventoryReservationRequestLine]
    ) -> None:
        await self.reserve_reference(
            reference_type=self.CHECKOUT_REFERENCE_TYPE,
            reference_id=checkout_session_id,
            lines=lines,
        )

    async def reaffirm_checkout_session(
        self, checkout_session_id: UUID, lines: list[InventoryReservationRequestLine]
    ) -> None:
        await self.reserve_checkout_session(checkout_session_id, lines)

    async def deduct_checkout_session(self, checkout_session_id: UUID) -> None:
        await self.deduct_reference(self.CHECKOUT_REFERENCE_TYPE, checkout_session_id)

    async def release_checkout_session(self, checkout_session_id: UUID) -> None:
        await self.release_reference(self.CHECKOUT_REFERENCE_TYPE, checkout_session_id)

    async def restore_order_lines(self, lines: list[tuple[UUID, int]]) -> None:
        """Cancel path: restore manual stock or settle ERP awaiting (never inflate mirror)."""
        if not lines:
            return
        variant_ids = [variant_id for variant_id, _ in lines]
        await self._repo.lock_items_by_variant_ids(variant_ids)
        touched: list[tuple[UUID, int]] = []
        for variant_id, quantity in lines:
            if quantity <= 0:
                continue
            if await self._variant_source.is_erp_managed(variant_id):
                await self._repo.settle_awaiting(variant_id, quantity)
            else:
                await self._repo.restore_on_hand(variant_id, quantity)
            touched.append((variant_id, quantity))
        await self._refresh_availability_for_variants(touched)

    async def settle_shipped_order_lines(self, lines: list[tuple[UUID, int]]) -> None:
        """Ship path: release awaiting for ERP-exported sales."""
        if not lines:
            return
        variant_ids = [variant_id for variant_id, _ in lines]
        await self._repo.lock_items_by_variant_ids(variant_ids)
        touched: list[tuple[UUID, int]] = []
        for variant_id, quantity in lines:
            if quantity <= 0:
                continue
            if await self._variant_source.is_erp_managed(variant_id):
                await self._repo.settle_awaiting(variant_id, quantity)
                touched.append((variant_id, quantity))
        await self._refresh_availability_for_variants(touched)

    async def reserve_reference(
        self,
        *,
        reference_type: str,
        reference_id: UUID,
        lines: list[InventoryReservationRequestLine],
    ) -> None:
        normalized = self._normalize_lines(lines)
        expires_at = self._new_expiry()
        existing = await self._repo.get_active_reservations(reference_type, reference_id)

        if existing:
            if self._matches(existing, normalized) and all(self._is_unexpired(r) for r in existing):
                for reservation in existing:
                    await self._repo.refresh_reservation_expiry(reservation.id, expires_at)
                return
            await self.release_reference(reference_type, reference_id)

        items = await self._repo.lock_items_by_variant_ids([line.variant_id for line in normalized])
        for line in normalized:
            item = items.get(line.variant_id)
            available = 0 if item is None else item.available_quantity
            if available < line.quantity:
                raise InsufficientInventoryError(line.variant_id, line.quantity, available)

        for line in normalized:
            await self._repo.increment_reserved(line.variant_id, line.quantity)
            await self._repo.create_reservation(
                variant_id=line.variant_id,
                quantity=line.quantity,
                reference_type=reference_type,
                reference_id=reference_id,
                expires_at=expires_at,
            )
        await self._refresh_availability_for_variants(
            [(line.variant_id, line.quantity) for line in normalized]
        )

    async def deduct_reference(self, reference_type: str, reference_id: UUID) -> None:
        reservations = await self._repo.get_active_reservations(reference_type, reference_id)
        if not reservations:
            raise InventoryReservationMissingError("No active inventory reservation exists")

        items = await self._repo.lock_items_by_variant_ids([r.variant_id for r in reservations])
        for reservation in reservations:
            item = items.get(reservation.variant_id)
            if item is None or item.quantity_reserved < reservation.quantity:
                raise InventoryReservationMissingError("Reserved inventory is no longer available")

        for reservation in reservations:
            erp_managed = await self._variant_source.is_erp_managed(reservation.variant_id)
            await self._repo.commit_reserved(
                reservation.variant_id,
                reservation.quantity,
                erp_managed=erp_managed,
            )
            await self._repo.set_reservation_status(
                reservation.id,
                InventoryReservationStatus.COMMITTED.value,
            )
        await self._refresh_availability_for_variants(
            [(r.variant_id, r.quantity) for r in reservations]
        )

    async def release_reference(self, reference_type: str, reference_id: UUID) -> None:
        reservations = await self._repo.get_active_reservations(reference_type, reference_id)
        if not reservations:
            return

        await self._repo.lock_items_by_variant_ids([r.variant_id for r in reservations])
        for reservation in reservations:
            await self._repo.release_reserved(reservation.variant_id, reservation.quantity)
            await self._repo.set_reservation_status(
                reservation.id,
                InventoryReservationStatus.RELEASED.value,
            )
        await self._refresh_availability_for_variants(
            [(r.variant_id, r.quantity) for r in reservations]
        )

    async def expire_active_reservations(self, now: datetime | None = None) -> int:
        now = now or datetime.now(UTC)
        reservations = await self._repo.get_expired_active_reservations(now)
        if not reservations:
            return 0

        await self._repo.lock_items_by_variant_ids([r.variant_id for r in reservations])
        for reservation in reservations:
            await self._repo.release_reserved(reservation.variant_id, reservation.quantity)
            await self._repo.set_reservation_status(
                reservation.id,
                InventoryReservationStatus.EXPIRED.value,
            )
        await self._refresh_availability_for_variants(
            [(r.variant_id, r.quantity) for r in reservations]
        )
        return len(reservations)

    async def _refresh_availability_for_variants(self, variants: list[tuple[UUID, int]]) -> None:
        if not variants:
            return
        unique_ids = sorted({variant_id for variant_id, _ in variants}, key=str)
        items = await self._repo.lock_items_by_variant_ids(unique_ids)
        for variant_id in unique_ids:
            item = items.get(variant_id)
            if item is None:
                continue
            await self._storefront.apply_availability(variant_id, item.available_quantity)

    @staticmethod
    def _normalize_lines(
        lines: list[InventoryReservationRequestLine],
    ) -> list[InventoryReservationRequestLine]:
        quantities: dict[UUID, int] = defaultdict(int)
        for line in lines:
            if line.quantity <= 0:
                raise ValueError("Reservation quantity must be positive")
            quantities[line.variant_id] += line.quantity
        return [
            InventoryReservationRequestLine(variant_id=variant_id, quantity=quantity)
            for variant_id, quantity in sorted(quantities.items(), key=lambda item: str(item[0]))
        ]

    def _new_expiry(self) -> datetime:
        return datetime.now(UTC) + self._reservation_ttl

    @staticmethod
    def _matches(
        reservations: list[InventoryReservation],
        lines: list[InventoryReservationRequestLine],
    ) -> bool:
        current = {reservation.variant_id: reservation.quantity for reservation in reservations}
        requested = {line.variant_id: line.quantity for line in lines}
        return current == requested

    @staticmethod
    def _is_unexpired(reservation: InventoryReservation) -> bool:
        expires_at = reservation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at > datetime.now(UTC)
