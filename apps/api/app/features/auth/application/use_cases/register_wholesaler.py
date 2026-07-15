"""Register wholesaler use case."""

import uuid
from datetime import datetime, timezone

from app.features.auth.domain.entities import User, WholesalerProfile
from app.features.auth.domain.ports import IPasswordHasher, IUnitOfWork, IUserRepository


class DuplicateEmailError(Exception):
    """Raised when the requested email is already taken."""


class DuplicateInnError(Exception):
    """Raised when the requested INN is already registered."""


class RegisterWholesalerUseCase:
    def __init__(
        self,
        repository: IUserRepository,
        hasher: IPasswordHasher,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._repository = repository
        self._hasher = hasher
        self._unit_of_work = unit_of_work

    async def execute(
        self,
        *,
        email: str,
        password: str,
        full_name: str,
        edo_provider: str,
        edo_id: str,
        phone: str,
        inn: str,
        ogrnip: str,
        legal_address: str,
    ) -> User:
        existing = await self._repository.get_by_email(email)
        if existing is not None:
            raise DuplicateEmailError(email)

        if await self._repository.get_by_inn(inn):
            raise DuplicateInnError(inn)

        hashed_password = self._hasher.hash(password)
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_wholesaler=True,
            created_at=datetime.now(timezone.utc),
            first_name="",
            last_name="",
            email_verified_at=None,
        )
        profile = WholesalerProfile(
            user_id=user.id,
            full_name=full_name.strip(),
            edo_provider=edo_provider.strip(),
            edo_id=edo_id.strip(),
            phone=phone.strip(),
            inn=inn,
            ogrnip=ogrnip,
            legal_address=legal_address.strip(),
            created_at=datetime.now(timezone.utc),
        )
        saved_user = await self._repository.create_wholesaler(user, profile)
        await self._unit_of_work.commit()
        return saved_user
