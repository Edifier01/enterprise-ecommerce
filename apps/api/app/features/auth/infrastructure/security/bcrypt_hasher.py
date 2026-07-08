"""bcrypt implementation of IPasswordHasher."""

import bcrypt

from app.features.auth.domain.ports import IPasswordHasher

# Computed once at import time so the bcrypt work factor is always paid
# during login even when the user does not exist (prevents timing-based
# user enumeration).
_DUMMY_HASH: str = bcrypt.hashpw(b"dummy-constant-time-guard", bcrypt.gensalt()).decode("utf-8")


class BcryptPasswordHasher(IPasswordHasher):
    def hash(self, plain_password: str) -> str:
        return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    @property
    def dummy_hash(self) -> str:
        return _DUMMY_HASH
