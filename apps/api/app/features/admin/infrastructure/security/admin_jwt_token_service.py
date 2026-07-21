"""Admin JWT service — separate scope from customer tokens."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.features.admin.domain.ports import InvalidAdminTokenError
from app.features.admin.domain.token_claims import AdminTokenClaims


class AdminJwtTokenService:
    def __init__(self, secret_key: str, algorithm: str, expire_minutes: int) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._expire_minutes = expire_minutes

    def create_access_token(
        self,
        admin_id: str,
        email: str,
        role: str,
        permissions: frozenset[str],
        *,
        is_active: bool,
    ) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=self._expire_minutes)
        payload = {
            "sub": admin_id,
            "email": email,
            "scope": "admin",
            "role": role,
            "permissions": sorted(permissions),
            "is_active": is_active,
            "exp": expire,
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)

    def verify_access_token(self, token: str) -> AdminTokenClaims:
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            if payload.get("scope") != "admin":
                raise InvalidAdminTokenError()
            if payload.get("is_active") is not True:
                raise InvalidAdminTokenError()
            admin_id_raw = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")
            permissions_raw = payload.get("permissions")
            if not admin_id_raw or not email or not role or not isinstance(permissions_raw, list):
                raise InvalidAdminTokenError()
            return AdminTokenClaims(
                admin_id=UUID(str(admin_id_raw)),
                email=str(email),
                role=str(role),
                permissions=frozenset(str(p) for p in permissions_raw),
            )
        except (JWTError, ValueError, TypeError) as exc:
            raise InvalidAdminTokenError() from exc
