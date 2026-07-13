"""User repository — SQLAlchemy implementation of IUserRepository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import IUserRepository
from app.features.auth.infrastructure.persistence.models import UserModel


class UserRepository(IUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        row = await self._session.get(UserModel, user_id)
        if row is None:
            return None
        return self._to_entity(row)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email)
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None
        return self._to_entity(row)

    async def create(self, user: User) -> User:
        model = UserModel(
            id=user.id,
            email=user.email,
            hashed_password=user.hashed_password,
            is_active=user.is_active,
            is_wholesaler=user.is_wholesaler,
            created_at=user.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    @staticmethod
    def _to_entity(row: UserModel) -> User:
        return User(
            id=row.id,
            email=row.email,
            hashed_password=row.hashed_password,
            is_active=row.is_active,
            is_wholesaler=row.is_wholesaler,
            created_at=row.created_at,
        )

    async def list_customers(self, page: int, limit: int) -> tuple[list[User], int]:
        offset = (page - 1) * limit
        total = int(
            (await self._session.scalar(select(func.count()).select_from(UserModel))) or 0
        )
        stmt = (
            select(UserModel)
            .order_by(UserModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self._session.scalars(stmt)).all()
        return [self._to_entity(row) for row in rows], total

    async def set_wholesaler(self, user_id: UUID, *, is_wholesaler: bool) -> User | None:
        row = await self._session.get(UserModel, user_id)
        if row is None:
            return None
        row.is_wholesaler = is_wholesaler
        await self._session.flush()
        await self._session.refresh(row)
        return self._to_entity(row)
