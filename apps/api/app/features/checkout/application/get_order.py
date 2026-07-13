"""Get customer order detail use case."""

from uuid import UUID

from app.features.checkout.domain.entities import Order, OrderLine
from app.features.checkout.domain.ports import ICheckoutRepository


class GetOrderUseCase:
    def __init__(self, repository: ICheckoutRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        order_number: str,
        customer_id: UUID,
    ) -> tuple[Order, list[OrderLine]] | None:
        return await self._repository.get_order_with_lines_by_number_for_customer(
            order_number=order_number,
            customer_id=customer_id,
        )
