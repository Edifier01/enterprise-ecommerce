#!/bin/sh
set -e

echo "Running database migrations (bootstrap)..."
alembic upgrade 001_add_products

echo "Widening alembic_version column for long revision ids..."
python -c "
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def main() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                'ALTER TABLE alembic_version '
                'ALTER COLUMN version_num TYPE VARCHAR(128)'
            )
        )
    await engine.dispose()

asyncio.run(main())
"

echo "Running database migrations (remaining)..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
