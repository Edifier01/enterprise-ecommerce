"""Exception handler tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_validation_error_format_is_consistent(client: AsyncClient) -> None:
    """422 errors return {"detail": [...]} — consistent JSON contract."""
    response = await client.get("/api/v1/products?page=0")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)
    assert len(data["detail"]) > 0


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client: AsyncClient) -> None:
    """Unknown routes return 404 with {"detail": ...} format."""
    response = await client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    assert "detail" in response.json()
