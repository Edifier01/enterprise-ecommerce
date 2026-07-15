"""Auth FastAPI dependencies — DI providers and JWT verification."""

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import (
    IAuthTokenRepository,
    IEmailService,
    IPasswordHasher,
    InvalidTokenError,
    ITokenService,
    IUnitOfWork,
    IUserRepository,
)
from app.features.auth.infrastructure.email.console_email_service import ConsoleEmailService
from app.features.auth.infrastructure.email.smtp_email_service import SmtpEmailService
from app.features.auth.infrastructure.persistence.auth_token_repository import AuthTokenRepository
from app.features.auth.infrastructure.persistence.repository import UserRepository
from app.features.auth.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher
from app.features.auth.infrastructure.security.jwt_token_service import JwtTokenService

_bearer = HTTPBearer(auto_error=False)
ACCESS_TOKEN_COOKIE = "access_token"


def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IUserRepository:
    return UserRepository(session)


def get_unit_of_work(
    session: AsyncSession = Depends(get_db_session),
) -> IUnitOfWork:
    return SqlAlchemyUnitOfWork(session)


def get_auth_token_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAuthTokenRepository:
    return AuthTokenRepository(session)


def get_email_service() -> IEmailService:
    if settings.email_provider == "smtp":
        return SmtpEmailService()
    return ConsoleEmailService()


def get_password_hasher() -> IPasswordHasher:
    return BcryptPasswordHasher()


def get_token_service() -> ITokenService:
    return JwtTokenService(
        secret_key=settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
        expire_minutes=settings.jwt_access_token_expire_minutes,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    repo: IUserRepository = Depends(get_user_repository),
    token_service: ITokenService = Depends(get_token_service),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        claims = token_service.verify_access_token(credentials.credentials)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = await repo.get_by_id(claims.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    access_token_cookie: str | None = Cookie(default=None, alias=ACCESS_TOKEN_COOKIE),
    repo: IUserRepository = Depends(get_user_repository),
    token_service: ITokenService = Depends(get_token_service),
) -> User | None:
    token = credentials.credentials if credentials is not None else access_token_cookie
    if token is None:
        return None
    try:
        claims = token_service.verify_access_token(token)
    except InvalidTokenError:
        return None
    user = await repo.get_by_id(claims.user_id)
    if user is None or not user.is_active:
        return None
    return user
