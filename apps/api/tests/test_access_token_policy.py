"""JWT token_version claim policy."""

from app.features.auth.application.access_token_policy import access_token_matches_user
from app.features.auth.domain.entities import User
from app.features.auth.domain.token_claims import TokenClaims


def test_access_token_matches_user_when_versions_equal() -> None:
    from datetime import datetime, timezone
    from uuid import uuid4

    user_id = uuid4()
    user = User(
        id=user_id,
        email="a@example.com",
        hashed_password="hash",
        is_active=True,
        is_wholesaler=False,
        created_at=datetime.now(timezone.utc),
        token_version=2,
    )
    claims = TokenClaims(user_id=user_id, email="a@example.com", token_version=2)
    assert access_token_matches_user(user, claims) is True


def test_access_token_rejected_after_password_reset_version_bump() -> None:
    from datetime import datetime, timezone
    from uuid import uuid4

    user_id = uuid4()
    user = User(
        id=user_id,
        email="a@example.com",
        hashed_password="hash",
        is_active=True,
        is_wholesaler=False,
        created_at=datetime.now(timezone.utc),
        token_version=1,
    )
    claims = TokenClaims(user_id=user_id, email="a@example.com", token_version=0)
    assert access_token_matches_user(user, claims) is False
