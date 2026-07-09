"""Auth HTTP routes — register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException

from app.features.auth.application.use_cases.login_user import (
    InvalidCredentialsError,
    LoginUserUseCase,
)
from app.features.auth.application.use_cases.register_user import (
    DuplicateEmailError,
    RegisterUserUseCase,
)
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import (
    IPasswordHasher,
    ITokenService,
    IUnitOfWork,
    IUserRepository,
)
from app.features.auth.presentation.dependencies import (
    get_current_user,
    get_password_hasher,
    get_token_service,
    get_unit_of_work,
    get_user_repository,
)
from app.features.auth.presentation.schemas import (
    LoginRequest,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.features.checkout.domain.ports import ICheckoutRepository
from app.features.checkout.presentation.dependencies import (
    get_checkout_repository,
    resolve_cart_session_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201, operation_id="registerUser")
async def register(
    request: RegisterRequest,
    repo: IUserRepository = Depends(get_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    uow: IUnitOfWork = Depends(get_unit_of_work),
) -> RegisterResponse:
    use_case = RegisterUserUseCase(repo, hasher, uow)
    try:
        user = await use_case.execute(email=request.email, password=request.password)
    except DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email already registered")
    return RegisterResponse(id=user.id, email=user.email, created_at=user.created_at)


@router.post("/login", response_model=TokenResponse, operation_id="loginUser")
async def login(
    request: LoginRequest,
    repo: IUserRepository = Depends(get_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    token_service: ITokenService = Depends(get_token_service),
    cart_session_token: str | None = Depends(resolve_cart_session_token),
    checkout_repo: ICheckoutRepository = Depends(get_checkout_repository),
) -> TokenResponse:
    use_case = LoginUserUseCase(repo, hasher, token_service)
    try:
        access_token = await use_case.execute(email=request.email, password=request.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if cart_session_token:
        user = await repo.get_by_email(request.email)
        if user is not None:
            await checkout_repo.merge_guest_cart_into_user_cart(cart_session_token, user.id)
            await checkout_repo.commit()
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=MeResponse, operation_id="getCurrentUser")
async def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=current_user.id, email=current_user.email, created_at=current_user.created_at)
