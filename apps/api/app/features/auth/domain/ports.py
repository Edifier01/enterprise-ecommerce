"""Auth domain ports — repository and service interfaces."""

from abc import ABC, abstractmethod
from uuid import UUID

from app.features.auth.domain.entities import User
from app.features.auth.domain.token_claims import TokenClaims


class InvalidTokenError(Exception):
    """Raised when a JWT is missing, expired, or malformed."""


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None:
        """Return a user by id, or None if not found."""
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Return a user by email, or None if not found."""
        ...

    @abstractmethod
    async def create(self, user: User) -> User:
        """Persist a new user (flush only — caller must commit)."""
        ...


class IPasswordHasher(ABC):
    @abstractmethod
    def hash(self, plain_password: str) -> str:
        """Return a hashed representation of plain_password."""
        ...

    @abstractmethod
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        """Return True if plain_password matches hashed_password."""
        ...

    @property
    @abstractmethod
    def dummy_hash(self) -> str:
        """A stable pre-computed hash for constant-time verification when no real hash is available."""
        ...


class ITokenService(ABC):
    @abstractmethod
    def create_access_token(self, user_id: str, email: str) -> str:
        """Issue a signed access token for the given identity."""
        ...

    @abstractmethod
    def verify_access_token(self, token: str) -> TokenClaims:
        """Validate a JWT and return its claims."""
        ...


class IUnitOfWork(ABC):
    @abstractmethod
    async def commit(self) -> None:
        """Commit the current unit of work."""
        ...
