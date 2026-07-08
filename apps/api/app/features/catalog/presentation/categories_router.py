"""Categories HTTP routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.catalog.application.use_cases.list_categories import ListCategoriesUseCase
from app.features.catalog.domain.ports import ICategoryRepository
from app.features.catalog.infrastructure.persistence.category_repository import CategoryRepository
from app.features.catalog.presentation.schemas import CategoryListResponse, CategorySchema

router = APIRouter(prefix="/categories", tags=["catalog"])


def get_category_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ICategoryRepository:
    return CategoryRepository(session)


@router.get("", response_model=CategoryListResponse, operation_id="listCategories")
async def list_categories(
    repo: ICategoryRepository = Depends(get_category_repository),
) -> CategoryListResponse:
    use_case = ListCategoriesUseCase(repo)
    categories = await use_case.execute()
    return CategoryListResponse(
        items=[CategorySchema.model_validate(c) for c in categories],
        total=len(categories),
    )
