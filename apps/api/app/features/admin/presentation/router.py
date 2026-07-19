"""Admin API router aggregation."""

from fastapi import APIRouter

from app.features.admin.presentation.auth_router import router as auth_router
from app.features.admin.presentation.dashboard_router import router as dashboard_router
from app.features.admin.presentation.media_router import router as media_admin_router
from app.features.auth.presentation.admin_customers_router import router as customers_admin_router
from app.features.catalog.presentation.admin_router import router as catalog_admin_router
from app.features.checkout.presentation.admin_router import router as orders_admin_router
from app.features.inventory.presentation.admin_router import router as inventory_admin_router
from app.features.integrations.moysklad.presentation.admin_router import (
    router as moysklad_admin_router,
)

router = APIRouter()
router.include_router(auth_router)
router.include_router(dashboard_router)
router.include_router(media_admin_router)
router.include_router(customers_admin_router)
router.include_router(catalog_admin_router)
router.include_router(inventory_admin_router)
router.include_router(orders_admin_router)
router.include_router(moysklad_admin_router)
