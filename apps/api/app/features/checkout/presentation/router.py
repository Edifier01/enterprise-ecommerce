"""Checkout HTTP routes — cart, checkout sessions, Stripe webhooks."""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from starlette.responses import JSONResponse

from app.core.config import settings
from app.features.auth.domain.entities import User
from app.features.checkout.application.cart_service import (
    CartService,
    LineNotFoundError,
    VariantNotPurchasableError,
)
from app.features.checkout.application.checkout_service import (
    CheckoutService,
    CheckoutSessionNotFoundError,
    EmptyCartError,
)
from app.features.checkout.application.webhook_service import WebhookService
from app.features.checkout.domain.entities import Cart
from app.features.checkout.domain.ports import ICheckoutRepository, StripeGatewayError, WebhookVerificationError
from app.features.checkout.presentation.dependencies import (
    get_cart_service,
    get_checkout_repository,
    get_checkout_service,
    get_optional_current_user,
    get_webhook_service,
    resolve_cart_session_token,
)
from app.features.checkout.presentation.schemas import (
    AddCartLineRequest,
    CartLineSchema,
    CartResponse,
    CheckoutSessionResponse,
    PaymentIntentResponse,
    UpdateCartLineRequest,
    WebhookResponse,
)
from app.features.inventory.application.inventory_service import InsufficientInventoryError

router = APIRouter(tags=["checkout"])

CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def _cart_to_response(cart: Cart) -> CartResponse:
    subtotal = cart.subtotal_cents
    return CartResponse(
        id=cart.id,
        status=cart.status.value,
        currency=cart.currency,
        subtotal_cents=subtotal,
        total_cents=subtotal,
        lines=[
            CartLineSchema(
                id=line.id,
                variant_id=line.variant_id,
                quantity=line.quantity,
                unit_price_cents=line.unit_price_cents,
                line_total_cents=line.unit_price_cents * line.quantity,
                currency=line.currency,
                product_snapshot=line.product_snapshot.to_dict(),
            )
            for line in cart.lines
        ],
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


def _set_cart_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=CartService.CART_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        max_age=CART_COOKIE_MAX_AGE,
        path="/",
    )


async def _resolve_and_maybe_set_cookie(
    response: Response,
    session_token: str | None,
    user: User | None,
    cart_service: CartService,
) -> Cart:
    cart, new_token = await cart_service.get_or_create_cart(
        session_token=session_token,
        user_id=user.id if user else None,
    )
    if new_token:
        _set_cart_cookie(response, new_token)
    return cart


@router.get("/cart", response_model=CartResponse, operation_id="getCart")
async def get_cart(
    response: Response,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    cart_service: CartService = Depends(get_cart_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CartResponse:
    cart, new_token = await cart_service.get_or_create_cart(
        session_token=session_token,
        user_id=user.id if user else None,
    )
    if new_token:
        _set_cart_cookie(response, new_token)
    await repo.commit()
    return _cart_to_response(cart)


@router.post("/cart/lines", response_model=CartResponse, operation_id="addCartLine")
async def add_cart_line(
    request: AddCartLineRequest,
    response: Response,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    cart_service: CartService = Depends(get_cart_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CartResponse:
    cart = await _resolve_and_maybe_set_cookie(response, session_token, user, cart_service)
    try:
        cart = await cart_service.add_or_update_line(cart, request.variant_id, request.quantity)
    except VariantNotPurchasableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except InsufficientInventoryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    await repo.commit()
    return _cart_to_response(cart)


@router.patch("/cart/lines/{line_id}", response_model=CartResponse, operation_id="updateCartLine")
async def update_cart_line(
    line_id: uuid.UUID,
    request: UpdateCartLineRequest,
    response: Response,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    cart_service: CartService = Depends(get_cart_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CartResponse:
    cart = await _resolve_and_maybe_set_cookie(response, session_token, user, cart_service)
    try:
        cart = await cart_service.update_line_quantity(cart, line_id, request.quantity)
    except LineNotFoundError:
        raise HTTPException(status_code=404, detail="Cart line not found")
    except VariantNotPurchasableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except InsufficientInventoryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    await repo.commit()
    return _cart_to_response(cart)


@router.delete("/cart/lines/{line_id}", response_model=CartResponse, operation_id="deleteCartLine")
async def delete_cart_line(
    line_id: uuid.UUID,
    response: Response,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    cart_service: CartService = Depends(get_cart_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CartResponse:
    cart = await _resolve_and_maybe_set_cookie(response, session_token, user, cart_service)
    try:
        cart = await cart_service.remove_line(cart, line_id)
    except LineNotFoundError:
        raise HTTPException(status_code=404, detail="Cart line not found")
    await repo.commit()
    return _cart_to_response(cart)


@router.post(
    "/checkout/sessions",
    response_model=CheckoutSessionResponse,
    status_code=201,
    operation_id="createCheckoutSession",
)
async def create_checkout_session(
    response: Response,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    cart_service: CartService = Depends(get_cart_service),
    checkout_service: CheckoutService = Depends(get_checkout_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CheckoutSessionResponse:
    cart = await _resolve_and_maybe_set_cookie(response, session_token, user, cart_service)
    try:
        session = await checkout_service.create_checkout_session(
            cart=cart,
            user_id=user.id if user else None,
            idempotency_key=idempotency_key,
        )
    except EmptyCartError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except VariantNotPurchasableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except InsufficientInventoryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await repo.commit()
    return CheckoutSessionResponse(
        id=session.id,
        cart_id=session.cart_id,
        status=session.status.value,
        currency=session.currency,
        subtotal_cents=session.subtotal_cents,
        total_cents=session.total_cents,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post(
    "/checkout/sessions/{session_id}/payment-intent",
    response_model=PaymentIntentResponse,
    operation_id="createPaymentIntent",
)
async def create_payment_intent(
    session_id: uuid.UUID,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    checkout_service: CheckoutService = Depends(get_checkout_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> PaymentIntentResponse | JSONResponse:
    if not settings.stripe_secret_key.get_secret_value():
        return JSONResponse(
            status_code=503,
            content={"detail": "Payment processing is temporarily unavailable"},
        )
    try:
        client_secret, payment_intent_id = await checkout_service.create_payment_intent(
            session_id=session_id,
            idempotency_key=idempotency_key,
            user_id=user.id if user else None,
            cart_session_token=session_token,
        )
    except CheckoutSessionNotFoundError:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    except StripeGatewayError:
        raise HTTPException(status_code=503, detail="Payment processing failed")
    except InsufficientInventoryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await repo.commit()
    return PaymentIntentResponse(
        client_secret=client_secret,
        payment_intent_id=payment_intent_id,
    )


@router.get(
    "/checkout/sessions/{session_id}",
    response_model=CheckoutSessionResponse,
    operation_id="getCheckoutSession",
)
async def get_checkout_session(
    session_id: uuid.UUID,
    session_token: str | None = Depends(resolve_cart_session_token),
    user: User | None = Depends(get_optional_current_user),
    checkout_service: CheckoutService = Depends(get_checkout_service),
    repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> CheckoutSessionResponse:
    try:
        session = await checkout_service.get_checkout_session(
            session_id,
            user_id=user.id if user else None,
            cart_session_token=session_token,
        )
    except CheckoutSessionNotFoundError:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    order = await repo.get_order_by_checkout_session(session_id)
    return CheckoutSessionResponse(
        id=session.id,
        cart_id=session.cart_id,
        status=session.status.value,
        currency=session.currency,
        subtotal_cents=session.subtotal_cents,
        total_cents=session.total_cents,
        order_number=order.order_number if order else None,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post(
    "/webhooks/stripe",
    response_model=WebhookResponse,
    operation_id="stripeWebhook",
    include_in_schema=True,
)
async def stripe_webhook(
    request: Request,
    webhook_service: WebhookService = Depends(get_webhook_service),
) -> WebhookResponse | JSONResponse:
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature")
    try:
        result = await webhook_service.handle_stripe_webhook(payload, signature)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Webhook verification failed")
    return WebhookResponse(status=result["status"])
