"""Admin authentication routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.client_ip import get_client_ip
from app.features.admin.application.login_admin import (
    AdminAccountLockedError,
    AdminLoginForbiddenIpError,
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
    request: Request,
    body: AdminLoginRequest,
    repo: IAdminUserRepository = Depends(get_admin_user_repository),
    hasher: IPasswordHasher = Depends(get_password_hasher),
    token_service: AdminJwtTokenService = Depends(get_admin_token_service),
) -> AdminTokenResponse:
    use_case = LoginAdminUseCase(repo, hasher, token_service)
    try:
        access_token = await use_case.execute(
            email=body.email,
            password=body.password,
            client_ip=get_client_ip(request),
        )
    except AdminLoginForbiddenIpError:
        raise HTTPException(status_code=403, detail="Login not allowed from this IP")
    except AdminAccountLockedError as exc:
        await repo.commit()
        locked_until = exc.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        retry_after = max(
            1,
            int((locked_until - datetime.now(timezone.utc)).total_seconds()),
        )
        raise HTTPException(
            status_code=429,
            detail="Account temporarily locked",
            headers={"Retry-After": str(retry_after)},
        )
    except InvalidAdminCredentialsError:
        await repo.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await repo.commit()
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
