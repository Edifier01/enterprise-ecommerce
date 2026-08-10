"""JWT implementation of ITokenService."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.features.auth.domain.ports import ITokenService, InvalidTokenError
from app.features.auth.domain.token_claims import TokenClaims


class JwtTokenService(ITokenService):
    def __init__(self, secret_key: str, algorithm: str, expire_minutes: int) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._expire_minutes = expire_minutes

    def create_access_token(self, user_id: str, email: str, *, token_version: int) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=self._expire_minutes)
        payload = {
            "sub": user_id,
            "email": email,
            "tv": token_version,
            "exp": expire,
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)

    def verify_access_token(self, token: str) -> TokenClaims:
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            user_id_raw = payload.get("sub")
            email = payload.get("email")
            if not user_id_raw or not email:
                raise InvalidTokenError()
            tv_raw = payload.get("tv", 0)
            token_version = int(tv_raw)
            return TokenClaims(
                user_id=UUID(str(user_id_raw)),
                email=str(email),
                token_version=token_version,
            )
        except (JWTError, ValueError, TypeError) as exc:
            raise InvalidTokenError() from exc
