"""Admin authentication routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.features.admin.application.login_admin import (
    InvalidAdminCredentialsError,
    LoginAdminUseCase,
)
from app.features.admin.domain.entities import AdminUser
from app.features.admin.domain.ports import IAdminUserRepository
from app.features.admin.infrastructure.security.admin_jwt_token_service import (
    AdminJwtTokenService,
)
from app.features.admin.presentation.dependencies import (
    get_admin_token_service,
    get_admin_user_repository,
    get_current_admin,
    get_password_hasher,
)
from app.features.admin.presentation.schemas import (
    AdminLoginRequest,
    AdminMeResponse,
    AdminTokenResponse,
)
from app.features.auth.domain.ports import IPasswordHasher

router = APIRouter(prefix="/admin/auth", tags=["admin"])


@router.post("/login", response_model=AdminTokenResponse, operation_id="adminLogin")
async def admin_login(
    request: AdminLoginRequest,
    repo: IAdminUserRepository = Depends(get_admin_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    token_service: AdminJwtTokenService = Depends(get_admin_token_service),
) -> AdminTokenResponse:
    use_case = LoginAdminUseCase(repo, hasher, token_service)
    try:
        access_token = await use_case.execute(email=request.email, password=request.password)
    except InvalidAdminCredentialsError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return AdminTokenResponse(access_token=access_token)


@router.get("/me", response_model=AdminMeResponse, operation_id="getCurrentAdmin")
async def admin_me(current_admin: AdminUser = Depends(get_current_admin)) -> AdminMeResponse:
    return AdminMeResponse(
        id=current_admin.id,
        email=current_admin.email,
        role=current_admin.role,
        permissions=sorted(current_admin.permissions),
        created_at=current_admin.created_at,
    )
