"""FastAPI application entrypoint."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.middleware import CheckoutRateLimitMiddleware, RequestIdMiddleware
from app.features.auth.presentation.router import router as auth_router
from app.features.catalog.presentation.categories_router import router as categories_router
from app.features.catalog.presentation.router import router as catalog_router
from app.features.checkout.presentation.dev_router import router as checkout_dev_router
from app.features.checkout.presentation.router import router as checkout_router

_LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] [request_id=%(request_id)s] %(message)s"


class _RequestIdFilter(logging.Filter):
    """Inject the current request_id ContextVar value into every LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        from app.core.middleware import request_id_var  # local import avoids circular dep

        record.request_id = request_id_var.get() or "-"  # type: ignore[attr-defined]
        return True


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if settings.environment == "development" else logging.INFO)


_configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await engine.dispose()


app = FastAPI(
    title="Enterprise E-Commerce API",
    version="0.1.0",
    description="REST API for catalog, checkout, orders, and payments.",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
    lifespan=lifespan,
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(CheckoutRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready() -> JSONResponse:
    """Readiness probe — verifies the database is reachable."""
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return JSONResponse(content={"status": "ready"})
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})


app.include_router(catalog_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(checkout_router, prefix="/api/v1")
app.include_router(checkout_dev_router, prefix="/api/v1")
