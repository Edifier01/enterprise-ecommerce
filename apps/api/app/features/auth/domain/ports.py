"""Auth domain ports — repository and service interfaces."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.features.auth.domain.entities import AuthToken, User, WholesalerProfile
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

    @abstractmethod
    async def create_wholesaler(self, user: User, profile: WholesalerProfile) -> User:
        """Persist a wholesaler user and business profile."""
        ...

    @abstractmethod
    async def get_by_inn(self, inn: str) -> User | None:
        """Return a wholesaler user by INN, or None if not found."""
        ...

    @abstractmethod
    async def list_customers(self, page: int, limit: int) -> tuple[list[User], int]:
        """Return paginated customer users and total count."""
        ...

    @abstractmethod
    async def set_wholesaler(self, user_id: UUID, *, is_wholesaler: bool) -> User | None:
        """Grant or revoke wholesaler status; None if user not found."""
        ...

    @abstractmethod
    async def mark_email_verified(self, user_id: UUID, *, verified_at: datetime) -> User | None:
        """Set email_verified_at for the user."""
        ...

    @abstractmethod
    async def update_password(self, user_id: UUID, hashed_password: str) -> User | None:
        """Replace the stored password hash."""
        ...


class IAuthTokenRepository(ABC):
    @abstractmethod
    async def create(self, token: AuthToken) -> AuthToken:
        """Persist a new auth token (flush only — caller must commit)."""
        ...

    @abstractmethod
    async def get_valid_by_hash(self, token_hash: str, token_type: str) -> AuthToken | None:
        """Return an unused, unexpired token or None."""
        ...

    @abstractmethod
    async def mark_used(self, token_id: UUID, *, used_at: datetime) -> None:
        """Mark a token as consumed."""
        ...

    @abstractmethod
    async def revoke_active_for_user(self, user_id: UUID, token_type: str) -> None:
        """Invalidate outstanding tokens of a given type for a user."""
        ...


@dataclass(frozen=True, slots=True)
class EmailMessage:
    to: str
    subject: str
    body_text: str


class IEmailService(ABC):
    @abstractmethod
    async def send(self, message: EmailMessage) -> None:
        """Deliver an email message."""
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
