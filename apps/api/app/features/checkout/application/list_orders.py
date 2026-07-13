"""List customer orders use case."""

from uuid import UUID

from app.features.checkout.domain.entities import Order
from app.features.checkout.domain.ports import ICheckoutRepository


class ListOrdersUseCase:
    def __init__(self, repository: ICheckoutRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        customer_id: UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Order], int]:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        return await self._repository.list_orders_by_customer(
            customer_id=customer_id,
            page=page,
            limit=limit,
        )
