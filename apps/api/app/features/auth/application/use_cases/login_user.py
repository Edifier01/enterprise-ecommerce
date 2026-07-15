"""Login user use case — verifies credentials and returns a JWT access token."""

from app.features.auth.domain.ports import IPasswordHasher, ITokenService, IUserRepository


class InvalidCredentialsError(Exception):
    """Raised when email/password combination is invalid."""


class EmailNotVerifiedError(Exception):
    """Raised when credentials are valid but email is not verified yet."""


class LoginUserUseCase:
    def __init__(
        self,
        repository: IUserRepository,
        hasher: IPasswordHasher,
        token_service: ITokenService,
    ) -> None:
        self._repository = repository
        self._hasher = hasher
        self._token_service = token_service

    async def execute(self, email: str, password: str) -> str:
        user = await self._repository.get_by_email(email)

        # Always run the full bcrypt check — even when no user exists — to keep
        # response time constant and prevent user-enumeration via timing.
        candidate_hash = user.hashed_password if user is not None else self._hasher.dummy_hash
        password_valid = self._hasher.verify(password, candidate_hash)

        if user is None or not password_valid or not user.is_active:
            raise InvalidCredentialsError()

        if not user.is_email_verified:
            raise EmailNotVerifiedError()

        return self._token_service.create_access_token(
            user_id=str(user.id),
            email=user.email,
        )
