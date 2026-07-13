"""Cart application service — resolve cart, manage lines."""

import secrets
import uuid

from app.features.catalog.domain.entities import ProductVariant
from app.features.catalog.domain.pricing import resolve_variant_price
from app.features.checkout.domain.entities import Cart, CartStatus, ProductSnapshot
from app.features.checkout.domain.ports import ICheckoutRepository
from app.features.inventory.application.inventory_service import InventoryService


class CartNotFoundError(Exception):
    pass


class LineNotFoundError(Exception):
    pass


class VariantNotPurchasableError(Exception):
    pass


class CartService:
    CART_COOKIE_NAME = "cart_session_id"

    def __init__(self, repo: ICheckoutRepository, inventory_service: InventoryService) -> None:
        self._repo = repo
        self._inventory_service = inventory_service

    @staticmethod
    def generate_session_token() -> str:
        return secrets.token_urlsafe(32)

    async def resolve_cart(
        self,
        session_token: str | None,
        user_id: uuid.UUID | None,
    ) -> tuple[Cart, str | None]:
        """Return active cart and optional new session token for cookie."""
        new_token: str | None = None

        if user_id is not None:
            cart = await self._repo.get_active_cart_by_user_id(user_id)
            if cart is None:
                cart = await self._repo.create_cart(session_token=None, user_id=user_id)
            return cart, new_token

        if session_token:
            cart = await self._repo.get_active_cart_by_session_token(session_token)
            if cart is not None:
                return cart, new_token

        new_token = self.generate_session_token()
        cart = await self._repo.create_cart(session_token=new_token, user_id=None)
        return cart, new_token

    async def get_or_create_cart(
        self,
        session_token: str | None,
        user_id: uuid.UUID | None,
    ) -> tuple[Cart, str | None]:
        return await self.resolve_cart(session_token, user_id)

    @staticmethod
    def _variant_entity(variant_model, product_model) -> ProductVariant:
        return ProductVariant(
            id=variant_model.id,
            product_id=product_model.id,
            sku=variant_model.sku,
            name=variant_model.name,
            price_cents=variant_model.price_cents,
            wholesale_price_cents=variant_model.wholesale_price_cents,
            in_stock=variant_model.in_stock,
            is_default=variant_model.is_default,
            sort_order=variant_model.sort_order,
            attributes=variant_model.attributes or {},
        )

    def _resolve_line_price(self, variant_model, product_model, *, is_wholesaler: bool):
        return resolve_variant_price(
            self._variant_entity(variant_model, product_model),
            is_wholesaler=is_wholesaler,
        )

    def _build_snapshot(self, variant, product, *, price_tier: str) -> ProductSnapshot:
        return ProductSnapshot(
            variant_id=variant.id,
            sku=variant.sku,
            name=variant.name,
            product_id=product.id,
            product_name=product.name,
            product_slug=product.slug,
            attributes=variant.attributes or {},
            price_cents=variant.price_cents,
            currency=product.currency,
            price_tier=price_tier,
        )

    def _validate_purchasable(self, variant, product) -> None:
        if not variant.in_stock or not product.in_stock:
            raise VariantNotPurchasableError("Product is out of stock")

    async def add_or_update_line(
        self,
        cart: Cart,
        variant_id: uuid.UUID,
        quantity: int,
        *,
        is_wholesaler: bool = False,
    ) -> Cart:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        row = await self._repo.get_variant_with_product(variant_id)
        if row is None:
            raise VariantNotPurchasableError("Variant not found")

        variant, product = row
        self._validate_purchasable(variant, product)
        await self._inventory_service.ensure_available(variant_id, quantity)
        resolved = self._resolve_line_price(variant, product, is_wholesaler=is_wholesaler)
        snapshot = self._build_snapshot(variant, product, price_tier=resolved.tier.value)

        await self._repo.upsert_cart_line(
            cart_id=cart.id,
            variant_id=variant_id,
            quantity=quantity,
            unit_price_cents=resolved.unit_price_cents,
            currency=product.currency,
            snapshot=snapshot,
        )
        refreshed = await self._repo.get_cart_by_id(cart.id)
        assert refreshed is not None
        return refreshed

    async def update_line_quantity(
        self,
        cart: Cart,
        line_id: uuid.UUID,
        quantity: int,
        *,
        is_wholesaler: bool = False,
    ) -> Cart:
        line = await self._repo.get_cart_line(line_id)
        if line is None or line.cart_id != cart.id:
            raise LineNotFoundError("Cart line not found")

        if quantity <= 0:
            await self._repo.delete_cart_line(line_id)
        else:
            row = await self._repo.get_variant_with_product(line.variant_id)
            if row is None:
                raise VariantNotPurchasableError("Variant not found")
            variant, product = row
            self._validate_purchasable(variant, product)
            await self._inventory_service.ensure_available(line.variant_id, quantity)
            resolved = self._resolve_line_price(variant, product, is_wholesaler=is_wholesaler)
            snapshot = self._build_snapshot(variant, product, price_tier=resolved.tier.value)
            await self._repo.upsert_cart_line(
                cart_id=cart.id,
                variant_id=line.variant_id,
                quantity=quantity,
                unit_price_cents=resolved.unit_price_cents,
                currency=product.currency,
                snapshot=snapshot,
            )

        refreshed = await self._repo.get_cart_by_id(cart.id)
        assert refreshed is not None
        return refreshed

    async def remove_line(self, cart: Cart, line_id: uuid.UUID) -> Cart:
        line = await self._repo.get_cart_line(line_id)
        if line is None or line.cart_id != cart.id:
            raise LineNotFoundError("Cart line not found")

        await self._repo.delete_cart_line(line_id)
        refreshed = await self._repo.get_cart_by_id(cart.id)
        assert refreshed is not None
        return refreshed

    async def validate_cart_for_checkout(
        self,
        cart: Cart,
        *,
        is_wholesaler: bool = False,
    ) -> Cart:
        if cart.status != CartStatus.ACTIVE:
            raise ValueError("Cart is not active")
        if cart.is_empty:
            raise ValueError("Cart is empty")

        for line in cart.lines:
            row = await self._repo.get_variant_with_product(line.variant_id)
            if row is None:
                raise VariantNotPurchasableError(f"Variant {line.variant_id} no longer available")
            variant, product = row
            self._validate_purchasable(variant, product)
            await self._inventory_service.ensure_available(line.variant_id, line.quantity)
            resolved = self._resolve_line_price(variant, product, is_wholesaler=is_wholesaler)
            if line.unit_price_cents != resolved.unit_price_cents or line.currency != product.currency:
                snapshot = self._build_snapshot(variant, product, price_tier=resolved.tier.value)
                await self._repo.upsert_cart_line(
                    cart_id=cart.id,
                    variant_id=line.variant_id,
                    quantity=line.quantity,
                    unit_price_cents=resolved.unit_price_cents,
                    currency=product.currency,
                    snapshot=snapshot,
                )

        refreshed = await self._repo.get_cart_by_id(cart.id)
        assert refreshed is not None
        return refreshed
