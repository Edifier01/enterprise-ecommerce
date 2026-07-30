"""Cryptographic helpers for single-use auth tokens."""

import hashlib
import secrets


def generate_raw_token() -> str:
    return secrets.token_urlsafe(32)


def generate_verification_code() -> str:
    """Return a 6-digit numeric code for email verification."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
