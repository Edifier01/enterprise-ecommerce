"""Auth HTTP routes — register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException

from app.features.auth.application.use_cases.forgot_password import ForgotPasswordUseCase
from app.features.auth.application.use_cases.login_user import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    LoginUserUseCase,
)
from app.features.auth.application.use_cases.register_user import (
    DuplicateEmailError,
    RegisterUserUseCase,
)
from app.features.auth.application.use_cases.register_wholesaler import (
    DuplicateEmailError as WholesalerDuplicateEmailError,
)
from app.features.auth.application.use_cases.register_wholesaler import (
    DuplicateInnError,
    RegisterWholesalerUseCase,
)
from app.features.auth.application.use_cases.resend_verification import ResendVerificationUseCase
from app.features.auth.application.use_cases.reset_password import (
    InvalidResetTokenError,
    ResetPasswordUseCase,
)
from app.features.auth.application.use_cases.send_email_verification import (
    SendEmailVerificationUseCase,
)
from app.features.auth.application.use_cases.verify_email import (
    InvalidVerificationTokenError,
    VerifyEmailUseCase,
)
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import (
    IAuthTokenRepository,
    IEmailService,
    IPasswordHasher,
    ITokenService,
    IUnitOfWork,
    IUserRepository,
)
from app.features.auth.presentation.dependencies import (
    get_auth_token_repository,
    get_current_user,
    get_email_service,
    get_password_hasher,
    get_token_service,
    get_unit_of_work,
    get_user_repository,
)
from app.features.auth.presentation.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
    WholesalerRegisterRequest,
)
from app.features.checkout.application.cart_service import CartService
from app.features.checkout.domain.ports import ICheckoutRepository
from app.features.checkout.presentation.dependencies import (
    get_cart_service,
    get_checkout_repository,
    resolve_cart_session_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _register_response(user: User) -> RegisterResponse:
    return RegisterResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at,
        email_verification_required=not user.is_email_verified,
    )


@router.post("/register", response_model=RegisterResponse, status_code=201, operation_id="registerUser")
async def register(
    request: RegisterRequest,
    repo: IUserRepository = Depends(get_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    uow: IUnitOfWork = Depends(get_unit_of_work),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    email_service: IEmailService = Depends(get_email_service),
) -> RegisterResponse:
    use_case = RegisterUserUseCase(repo, hasher, uow)
    try:
        user = await use_case.execute(
            email=request.email,
            password=request.password,
            first_name=request.first_name,
            last_name=request.last_name,
        )
    except DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email already registered")

    send_verification = SendEmailVerificationUseCase(token_repo, email_service, uow)
    await send_verification.execute(user)
    return _register_response(user)


@router.post(
    "/register/wholesaler",
    response_model=RegisterResponse,
    status_code=201,
    operation_id="registerWholesaler",
)
async def register_wholesaler(
    request: WholesalerRegisterRequest,
    repo: IUserRepository = Depends(get_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    uow: IUnitOfWork = Depends(get_unit_of_work),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    email_service: IEmailService = Depends(get_email_service),
) -> RegisterResponse:
    use_case = RegisterWholesalerUseCase(repo, hasher, uow)
    try:
        user = await use_case.execute(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            edo_provider=request.edo_provider,
            edo_id=request.edo_id,
            phone=request.phone,
            inn=request.inn,
            ogrnip=request.ogrnip,
            legal_address=request.legal_address,
        )
    except WholesalerDuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except DuplicateInnError:
        raise HTTPException(status_code=409, detail="INN already registered")

    send_verification = SendEmailVerificationUseCase(token_repo, email_service, uow)
    await send_verification.execute(user)
    return _register_response(user)


@router.post("/login", response_model=TokenResponse, operation_id="loginUser")
async def login(
    request: LoginRequest,
    repo: IUserRepository = Depends(get_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    token_service: ITokenService = Depends(get_token_service),
    cart_session_token: str | None = Depends(resolve_cart_session_token),
    checkout_repo: ICheckoutRepository = Depends(get_checkout_repository),
    cart_service: CartService = Depends(get_cart_service),
) -> TokenResponse:
    use_case = LoginUserUseCase(repo, hasher, token_service)
    try:
        access_token = await use_case.execute(email=request.email, password=request.password)
    except EmailNotVerifiedError:
        raise HTTPException(status_code=403, detail="Email not verified")
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if cart_session_token:
        user = await repo.get_by_email(request.email)
        if user is not None:
            cart = await checkout_repo.merge_guest_cart_into_user_cart(cart_session_token, user.id)
            if not cart.is_empty:
                cart = await cart_service.validate_cart_for_checkout(
                    cart, is_wholesaler=user.is_wholesaler
                )
            await checkout_repo.commit()
    return TokenResponse(access_token=access_token)


@router.post("/verify-email", response_model=MessageResponse, operation_id="verifyEmail")
async def verify_email(
    request: VerifyEmailRequest,
    repo: IUserRepository = Depends(get_user_repository),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    uow: IUnitOfWork = Depends(get_unit_of_work),
) -> MessageResponse:
    use_case = VerifyEmailUseCase(repo, token_repo, uow)
    try:
        await use_case.execute(request.token)
    except InvalidVerificationTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    return MessageResponse(message="Email verified successfully")


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    operation_id="resendVerification",
)
async def resend_verification(
    request: ResendVerificationRequest,
    repo: IUserRepository = Depends(get_user_repository),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    email_service: IEmailService = Depends(get_email_service),
    uow: IUnitOfWork = Depends(get_unit_of_work),
) -> MessageResponse:
    send_verification = SendEmailVerificationUseCase(token_repo, email_service, uow)
    use_case = ResendVerificationUseCase(repo, send_verification)
    await use_case.execute(request.email)
    return MessageResponse(
        message="If the account exists and is not verified, a verification email was sent."
    )


@router.post("/forgot-password", response_model=MessageResponse, operation_id="forgotPassword")
async def forgot_password(
    request: ForgotPasswordRequest,
    repo: IUserRepository = Depends(get_user_repository),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    email_service: IEmailService = Depends(get_email_service),
    uow: IUnitOfWork = Depends(get_unit_of_work),
) -> MessageResponse:
    use_case = ForgotPasswordUseCase(repo, token_repo, email_service, uow)
    await use_case.execute(request.email)
    return MessageResponse(message="If the account exists, a password reset email was sent.")


@router.post("/reset-password", response_model=MessageResponse, operation_id="resetPassword")
async def reset_password(
    request: ResetPasswordRequest,
    repo: IUserRepository = Depends(get_user_repository),
    token_repo: IAuthTokenRepository = Depends(get_auth_token_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    uow: IUnitOfWork = Depends(get_unit_of_work),
) -> MessageResponse:
    use_case = ResetPasswordUseCase(repo, token_repo, hasher, uow)
    try:
        await use_case.execute(request.token, request.password)
    except InvalidResetTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return MessageResponse(message="Password reset successfully")


@router.get("/me", response_model=MeResponse, operation_id="getCurrentUser")
async def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_wholesaler=current_user.is_wholesaler,
        email_verified=current_user.is_email_verified,
        created_at=current_user.created_at,
    )
