"""Shared rules for matching JWT claims to persisted user state."""

from app.features.auth.domain.entities import User
from app.features.auth.domain.token_claims import TokenClaims


def access_token_matches_user(user: User, claims: TokenClaims) -> bool:
    return user.is_active and claims.token_version == user.token_version
