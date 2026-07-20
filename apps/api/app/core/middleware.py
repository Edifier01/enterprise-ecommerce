"""Core middleware — request-id propagation."""

import uuid
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from contextvars import ContextVar
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

# Module-level ContextVar so any code in the request lifecycle can read the
# current request id without threading or coupling to HTTP internals.
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Read or generate X-Request-ID, expose it via ContextVar, echo it in the response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_var.set(rid)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = rid
        return response


class CheckoutRateLimitMiddleware(BaseHTTPMiddleware):
    """Small in-process limiter for payment-sensitive checkout endpoints."""

    WINDOW_SECONDS = 60
    DEFAULT_LIMIT = 60
    SEARCH_LIMIT = 60
    WEBHOOK_LIMIT = 100
    PAYMENT_INTENT_LIMIT = 10
    ADMIN_LOGIN_LIMIT = 10
    MUTATING_METHODS = {"POST", "PATCH", "DELETE"}

    def __init__(self, app) -> None:
        super().__init__(app)
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def _limit_for(self, request: Request) -> int | None:
        path = request.url.path
        if path == "/api/v1/webhooks/stripe":
            return self.WEBHOOK_LIMIT
        if (
            path.startswith("/api/v1/checkout/sessions/")
            and path.endswith("/payment-intent")
            and request.method == "POST"
        ):
            return self.PAYMENT_INTENT_LIMIT
        if path.startswith(("/api/v1/cart", "/api/v1/checkout")) and request.method in self.MUTATING_METHODS:
            return self.DEFAULT_LIMIT
        if path == "/api/v1/products/search" and request.method == "GET":
            return self.SEARCH_LIMIT
        if path == "/api/v1/admin/auth/login" and request.method == "POST":
            return self.ADMIN_LOGIN_LIMIT
        return None

    @staticmethod
    def _client_key(request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",", maxsplit=1)[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if settings.environment == "test":
            return await call_next(request)

        limit = self._limit_for(request)
        if limit is None:
            return await call_next(request)

        now = monotonic()
        key = f"{self._client_key(request)}:{request.method}:{request.url.path}"
        bucket = self._buckets[key]
        while bucket and now - bucket[0] >= self.WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(self.WINDOW_SECONDS - (now - bucket[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
        return await call_next(request)
