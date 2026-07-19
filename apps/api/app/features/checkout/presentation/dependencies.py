"""Checkout FastAPI dependencies."""

from datetime import timedelta

from fastapi import Cookie, Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import InvalidTokenError, ITokenService
from app.features.auth.infrastructure.persistence.repository import UserRepository
from app.features.auth.infrastructure.security.jwt_token_service import JwtTokenService
from app.features.checkout.application.cart_service import CartService
from app.features.checkout.application.checkout_service import CheckoutService
from app.features.checkout.application.webhook_service import WebhookService
from app.features.integrations.moysklad.application.export_order import OrderExportService
from app.features.checkout.domain.ports import ICheckoutRepository, IStripeGateway
from app.features.checkout.infrastructure.persistence.repository import CheckoutRepository
from app.features.checkout.infrastructure.stub.gateway import StubPaymentGateway
from app.features.checkout.infrastructure.stripe.gateway import StripeGateway
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.domain.ports import IInventoryRepository
from app.features.inventory.infrastructure.persistence.repository import InventoryRepository

_bearer = HTTPBearer(auto_error=False)

CART_SESSION_HEADER = "X-Cart-Session-Id"
ACCESS_TOKEN_COOKIE = "access_token"


def get_checkout_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ICheckoutRepository:
    return CheckoutRepository(session)


def get_inventory_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IInventoryRepository:
    return InventoryRepository(session)


def get_inventory_service(
    repo: IInventoryRepository = Depends(get_inventory_repository),
) -> InventoryService:
    return InventoryService(
        repo,
        reservation_ttl=timedelta(minutes=settings.inventory_reservation_ttl_minutes),
    )


def get_stripe_gateway() -> IStripeGateway:
    if settings.get_payment_provider() == "stub":
        return StubPaymentGateway()
    return StripeGateway()


def get_cart_service(
    repo: ICheckoutRepository = Depends(get_checkout_repository),
    inventory_service: InventoryService = Depends(get_inventory_service),
) -> CartService:
    return CartService(repo, inventory_service)


def get_checkout_service(
    repo: ICheckoutRepository = Depends(get_checkout_repository),
    cart_service: CartService = Depends(get_cart_service),
    stripe_gateway: IStripeGateway = Depends(get_stripe_gateway),
    inventory_service: InventoryService = Depends(get_inventory_service),
) -> CheckoutService:
    return CheckoutService(repo, cart_service, stripe_gateway, inventory_service)


def get_order_export_service(
    session: AsyncSession = Depends(get_db_session),
) -> OrderExportService:
    return OrderExportService(session)


def get_webhook_service(
    repo: ICheckoutRepository = Depends(get_checkout_repository),
    stripe_gateway: IStripeGateway = Depends(get_stripe_gateway),
    inventory_service: InventoryService = Depends(get_inventory_service),
    order_export: OrderExportService = Depends(get_order_export_service),
) -> WebhookService:
    return WebhookService(repo, stripe_gateway, inventory_service, order_export)


def _get_token_service() -> ITokenService:
    return JwtTokenService(
        secret_key=settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
        expire_minutes=settings.jwt_access_token_expire_minutes,
    )


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    access_token_cookie: str | None = Cookie(default=None, alias=ACCESS_TOKEN_COOKIE),
    session: AsyncSession = Depends(get_db_session),
) -> User | None:
    token = credentials.credentials if credentials is not None else access_token_cookie
    if token is None:
        return None
    token_service = _get_token_service()
    repo = UserRepository(session)
    try:
        claims = token_service.verify_access_token(token)
    except InvalidTokenError:
        return None
    user = await repo.get_by_id(claims.user_id)
    if user is None or not user.is_active:
        return None
    return user


def resolve_cart_session_token(
    cart_session_id: str | None = Cookie(default=None, alias=CartService.CART_COOKIE_NAME),
    x_cart_session_id: str | None = Header(default=None, alias=CART_SESSION_HEADER),
) -> str | None:
    return cart_session_id or x_cart_session_id
