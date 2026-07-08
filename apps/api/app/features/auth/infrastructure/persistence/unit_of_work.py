"""SQLAlchemy implementation of IUnitOfWork."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.domain.ports import IUnitOfWork


class SqlAlchemyUnitOfWork(IUnitOfWork):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def commit(self) -> None:
        await self._session.commit()
