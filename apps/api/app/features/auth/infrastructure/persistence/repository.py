"""User repository — SQLAlchemy implementation of IUserRepository."""

from uuid import UUID

from sqlalchemy import select
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
            created_at=row.created_at,
        )
