"""Auth token repository — SQLAlchemy implementation."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.domain.entities import AuthToken
from app.features.auth.domain.ports import IAuthTokenRepository
from app.features.auth.infrastructure.persistence.models import AuthTokenModel


class AuthTokenRepository(IAuthTokenRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, token: AuthToken) -> AuthToken:
        model = AuthTokenModel(
            id=token.id,
            user_id=token.user_id,
            token_hash=token.token_hash,
            token_type=token.token_type,
            expires_at=token.expires_at,
            used_at=token.used_at,
            created_at=token.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_valid_by_hash(self, token_hash: str, token_type: str) -> AuthToken | None:
        now = datetime.now(timezone.utc)
        stmt = select(AuthTokenModel).where(
            AuthTokenModel.token_hash == token_hash,
            AuthTokenModel.token_type == token_type,
            AuthTokenModel.used_at.is_(None),
            AuthTokenModel.expires_at > now,
        )
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None
        return self._to_entity(row)

    async def mark_used(self, token_id: UUID, *, used_at: datetime) -> None:
        await self._session.execute(
            update(AuthTokenModel)
            .where(AuthTokenModel.id == token_id)
            .values(used_at=used_at)
        )
        await self._session.flush()

    async def revoke_active_for_user(self, user_id: UUID, token_type: str) -> None:
        await self._session.execute(
            delete(AuthTokenModel).where(
                AuthTokenModel.user_id == user_id,
                AuthTokenModel.token_type == token_type,
                AuthTokenModel.used_at.is_(None),
            )
        )
        await self._session.flush()

    @staticmethod
    def _to_entity(row: AuthTokenModel) -> AuthToken:
        return AuthToken(
            id=row.id,
            user_id=row.user_id,
            token_hash=row.token_hash,
            token_type=row.token_type,
            expires_at=row.expires_at,
            used_at=row.used_at,
            created_at=row.created_at,
        )
