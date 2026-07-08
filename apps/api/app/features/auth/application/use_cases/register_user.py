"""Register user use case."""

import uuid
from datetime import datetime, timezone

from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import IPasswordHasher, IUnitOfWork, IUserRepository


class DuplicateEmailError(Exception):
    """Raised when the requested email is already taken."""


class RegisterUserUseCase:
    def __init__(
        self,
        repository: IUserRepository,
        hasher: IPasswordHasher,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._repository = repository
        self._hasher = hasher
        self._unit_of_work = unit_of_work

    async def execute(self, email: str, password: str) -> User:
        existing = await self._repository.get_by_email(email)
        if existing is not None:
            raise DuplicateEmailError(email)

        hashed_password = self._hasher.hash(password)
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        saved_user = await self._repository.create(user)
        await self._unit_of_work.commit()
        return saved_user
