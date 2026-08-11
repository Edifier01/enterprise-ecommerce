"""Short-lived JWT for admin draft product preview (EUX-011)."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt


class InvalidProductPreviewTokenError(Exception):
    pass


@dataclass(frozen=True)
class ProductPreviewTokenClaims:
    product_id: UUID
    slug: str


class ProductPreviewTokenService:
    SCOPE = "product_preview"

    def __init__(self, secret_key: str, algorithm: str, expire_minutes: int) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._expire_minutes = expire_minutes

    def create_token(self, product_id: UUID, slug: str) -> tuple[str, datetime]:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self._expire_minutes)
        payload = {
            "sub": str(product_id),
            "slug": slug,
            "scope": self.SCOPE,
            "exp": expires_at,
        }
        token = jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
        return token, expires_at

    def verify_token(self, token: str) -> ProductPreviewTokenClaims:
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            if payload.get("scope") != self.SCOPE:
                raise InvalidProductPreviewTokenError()
            product_id_raw = payload.get("sub")
            slug = payload.get("slug")
            if not product_id_raw or not slug:
                raise InvalidProductPreviewTokenError()
            return ProductPreviewTokenClaims(product_id=UUID(str(product_id_raw)), slug=str(slug))
        except (JWTError, ValueError, TypeError) as exc:
            raise InvalidProductPreviewTokenError() from exc
