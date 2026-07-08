---
name: implement-catalog-feature
description: Implement product catalog features — products, categories, variants, inventory — with PostgreSQL and FastAPI.
---

# Implement Catalog Feature

> **Stack:** Next.js + FastAPI + PostgreSQL  
> **Rules:** ecommerce/01-catalog, ecommerce/05-inventory, database/*  
> **Skills:** postgresql, postgresql-optimization, inventory-demand-planning  
> **Agents:** catalog-specialist, database-engineer  
> **MCP:** PostgreSQL, OpenAPI, Context7

## Workflow

### 1. Domain

- Aggregates: Product, Category, ProductVariant, StockLevel
- Feature folder: `apps/api/app/features/catalog/`
- Public catalog API vs admin API separation

### 2. Database

- Normalized schema with indexes on slug, category_id, sku
- Use `postgresql` skill for schema design
- Alembic migration with rollback plan

### 3. API

- REST: `/api/v1/products`, `/api/v1/categories`
- Pagination, filtering, sorting
- OpenAPI-first (`openapi-spec-generator`)

### 4. Frontend

- Product listing: Server Components where possible
- Admin: shadcn DataTable patterns
- Search: defer to search feature module

### 5. Inventory

- Stock reservation rules with checkout module
- `inventory-demand-planning` for replenishment logic if needed

## Validation

- Repository tests with test DB
- API contract matches OpenAPI spec
- No N+1 queries on product lists
