# Руководство: Enterprise AI Development Platform

Документ для любого участника команды — что создано, зачем это нужно и как с этим работать в Cursor.

---

## 1. Что это такое

Это **не просто код интернет-магазина**. Это двухслойная система:

| Слой | Путь | Назначение |
|------|------|------------|
| **AI Platform** | `.cursor/` | «Команда AI-специалистов» — правила, навыки, агенты, MCP |
| **Приложение** | `apps/web`, `apps/api` | Сам магазин: витрина + API + БД |

Cursor IDE читает `.cursor/` и ведёт себя как команда разработчиков с общими стандартами, а не как «один чат без памяти».

**Стек приложения:** Next.js + FastAPI + PostgreSQL + Stripe (планируется).

---

## 2. Как это работает (общая схема)

```
Вы (разработчик)
    │
    ▼
Cursor Agent (главный ассистент)
    │
    ├── Rules (.mdc)     → ЧТО обязательно (архитектура, стандарты)
    ├── Skills (SKILL.md)→ КАК делать (workflow, Stripe, FastAPI…)
    ├── Agents (.md)    → КТО делает (backend-engineer, checkout-specialist…)
    ├── MCP             → Внешние инструменты (PostgreSQL, GitHub, Playwright…)
    └── Models          → Composer 2.5 / GPT-5.5 / Opus — по типу задачи
    │
    ▼
Код в apps/web и apps/api
```

**Принцип:** не одна модель на всё, а **роутинг задачи** в модель + skill + agent + MCP, которые для неё лучше подходят.

---

## 3. Компоненты AI Platform

### 3.1 Rules (правила) — `.cursor/rules/`

**73 файла** в категориях: `core`, `architecture`, `backend`, `frontend`, `api`, `database`, `ecommerce`, `security`, и др.

| Тип | Пример | Когда активны |
|-----|--------|----------------|
| Всегда | `core/00-core`, `01-project`, `02-ai-behavior`, `10-project-state-management` | Каждый чат |
| По файлам | `backend/*.mdc` с `globs: apps/api/**/*.py` | При работе с Python API |
| По запросу | остальные | Когда агент считает релевантными |

**Зачем:** единые стандарты — DDD, Clean Architecture, PCI для платежей, без «каждый раз с нуля».

**Ключевые правила:**

- `core/08-model-routing.mdc` — какую модель выбрать
- `core/09-implementation-efficiency.mdc` — минимальный diff (адаптация ponytail)
- `ecommerce/02-checkout`, `03-payments` — домен магазина

---

### 3.2 Skills (навыки) — `.cursor/skills/`

**46 skills** — пошаговые инструкции для конкретных задач.

| Tier | Примеры | Для чего |
|------|---------|----------|
| 1 — Stack | `shadcn`, `fastapi-pro`, `postgresql` | Next.js, FastAPI, БД |
| 2 — E-commerce | `stripe-integration`, `pci-compliance` | Платежи, PCI |
| 3 — Architecture | `architecture-decision-records`, `ddd-context-mapping` | ADR, границы контекстов |
| 4 — DevOps | `docker-expert`, `e2e-testing` | CI, тесты |
| 5 — SEO | `schema-markup`, `seo-audit` | Продвижение |
| Native | `model-routing`, `context-loading`, `implement-checkout-flow` | Мета-workflow проекта |

**Как вызвать:**

```
/context-loading
/implement-catalog-feature
/stripe-integration
/shadcn
```

Или `@skill-name` — прикрепить skill к сообщению.

**Не знаете с чего начать?** → `/skill-router`

---

### 3.3 Agents (субагенты) — `.cursor/agents/`

**12 специалистов** — изолированный контекст для сложных задач.

| Agent | Роль | Модель |
|-------|------|--------|
| `project-orchestrator` | Координатор фич, планирование | GPT-5.5 (readonly) |
| `enterprise-architect` | Архитектура, ADR | Opus |
| `backend-engineer` | FastAPI, use cases | Composer 2.5 |
| `frontend-engineer` | Next.js, shadcn | Composer 2.5 |
| `database-engineer` | PostgreSQL, миграции | Composer 2.5 |
| `api-engineer` | OpenAPI, REST | Composer 2.5 |
| `checkout-specialist` | Checkout, Stripe | Opus |
| `catalog-specialist` | Каталог, товары | Composer 2.5 |
| `security-auditor` | Безопасность, PCI | Opus (readonly) |
| `qa-engineer` | E2E, Playwright | Composer 2.5 |
| `devops-engineer` | Docker, CI | GPT-5.5 |
| `verifier` | Проверка «готово» | Composer 2.5 (readonly) |

> **Политика AI-002:** Opus только для architect / security / checkout.
> Orchestrator и verifier — на более дешёвых моделях.

**Как вызвать:**

```
/checkout-specialist реализуй webhook Stripe
/verifier проверь что catalog API работает
```

Для больших задач (3+ файла): skill `subagent-orchestrator` — параллельные агенты.

---

### 3.4 MCP (внешние инструменты) — `.cursor/mcp.json`

Подключает Cursor к внешнему миру:

| MCP | Назначение |
|-----|------------|
| context7 | Актуальная документация библиотек |
| github | PR, issues, commits |
| postgres | SQL, схема БД |
| playwright | E2E в браузере |
| shadcn | Компоненты UI |
| docker | Контейнеры (Docker Desktop) |
| fetch | Загрузка URL |
| memory | Память решений проекта |
| project-files | Файлы проекта, `openapi.yaml`, docs |

**Настройка:** см. `docs/SETUP.md` — env vars, `setup-mcp-env.ps1`, перезапуск Cursor.

---

### 3.6 Project Management (память проекта) — `.cursor/project-management/`

Операционный слой координации AI-агентов между сессиями. **Не заменяет** `PROJECT_ROADMAP.md` (стратегия) и `docs/adr/` (архитектура).

| Файл | Назначение |
|------|------------|
| `CURRENT_CONTEXT.md` | Обзор за 30 секунд — читать первым |
| `PROJECT_STATUS.md` | Текущая фаза, прогресс, риски |
| `TASKS.md` | Реестр задач (BACKLOG → COMPLETED) |
| `DECISIONS.md` | Индекс решений со ссылками на ADR |
| `HANDOFF.md` | Передача работы между агентами |

**Hooks:** `.cursor/hooks.json` — при старте сессии inject `CURRENT_CONTEXT`, при завершении — reminder обновить PM-файлы.

**Rule:** `core/10-project-state-management.mdc` (always-on) — обязательное чтение и обновление state.

---

### 3.5 Model Routing (выбор модели)

| Задача | Модель | Почему |
|--------|--------|--------|
| CRUD, UI, тесты, верификация | **Composer 2.5** | Быстро, cost-effective |
| Research, планирование, orchestration | **GPT-5.5** | Координация, сравнения |
| Архитектура, security, checkout (COMPLEX) | **Opus** | Глубокий reasoning |

Политика **AI-002**: orchestrator → GPT-5.5, verifier → Composer 2.5, Opus только для architect/security/checkout.

Skill: `/model-routing`  
Шпаргалка: `docs/MODEL-ROUTING.md`

---

## 4. Код приложения (Phase 24)

```
apps/
├── api/                 FastAPI
│   └── app/
│       ├── main.py      /health
│       ├── core/        config
│       └── features/    catalog, checkout, … (будущее)
└── web/                 Next.js
    └── src/app/         страницы
openapi.yaml             контракт API
docker-compose.yml       PostgreSQL локально
```

**Запуск:** см. корневой `README.md`.

---

## 5. Типичный рабочий день

### 5.1 Новая фича через /start-feature

Это рекомендуемый способ начать любую фичу любого домена:

1. `/start-feature <бизнес-цель>`
2. `project-orchestrator` анализирует и создаёт Feature Plan
3. Подтвердить план (написать "ok" или "proceed")
4. Субагенты выполняют работу параллельно
5. `verifier` проверяет результат
6. PM state обновляется автоматически

```
/start-feature добавить систему отзывов товаров
/start-feature реализовать корзину покупателя
/start-feature добавить поиск по каталогу
/start-feature создать страницу заказа
```

Полный workflow: [docs/MASTER-AI-WORKFLOW.md](docs/MASTER-AI-WORKFLOW.md)

---

### Новая фича (например, каталог товаров)

0. Hook загружает `CURRENT_CONTEXT.md`; прочитать `HANDOFF.md`
1. `/context-loading` — project state + rules/skills/MCP
2. `/model-routing` — Composer 2.5 для реализации
3. `/implement-catalog-feature` или `/catalog-specialist`
4. Реализация в `apps/api/app/features/catalog/` и `apps/web/`
5. `/verifier` — проверка перед «готово»
6. Обновить `.cursor/project-management/` (TASKS, HANDOFF, STATUS, CONTEXT)

### Checkout + Stripe

1. **Agent:** `checkout-specialist` — **Model:** Opus (`claude-opus-4-8-thinking-high`)
2. Реализация API/UI: `backend-engineer` + `frontend-engineer` (Composer 2.5)
3. `/implement-checkout-flow` + `/stripe-integration`
4. `/security-auditor` — PCI (Opus)
5. **Code review:** routine → `/verifier` (Composer 2.5); architectural/security → Opus
6. `/playwright-e2e-checkout` — E2E (Composer 2.5)

### Не знаете с чего начать

```
/skill-router
```

---

## 6. Документация (куда смотреть)

| Файл | Содержание |
|------|------------|
| `docs/GUIDE.md` | Это руководство |
| `docs/MASTER-AI-WORKFLOW.md` | Полный справочник по AI-команде и Feature Lifecycle |
| `docs/SETUP.md` | Установка Cursor + MCP |
| `docs/SKILL-MANIFEST.md` | Все skills + таблица routing |
| `docs/MODEL-ROUTING.md` | Выбор модели |
| `docs/TIER1-SKILLS.md` … `TIER3-5` | Skills по уровням |
| `docs/reviews/ARCHITECTURE-REVIEW.md` | Phase 22 |
| `docs/reviews/ENTERPRISE-REVIEW.md` | Phase 23 |
| `docs/adr/ADR-001-monorepo-structure.md` | Решение о monorepo |
| `PROJECT_ROADMAP.md` | Roadmap фаз |
| `.cursor/project-management/` | Операционное состояние проекта для агентов |
| `.cursor/README.md` | Кратко про `.cursor/` |

---

## 7. Частые вопросы

**Rules не применяются?**  
Откройте workspace с корнем репозитория, где есть папка `.cursor/`. Перезапустите Cursor.

**MCP красная точка?**  
Проверьте env vars и `Settings → MCP → Logs`.

**Слишком много контекста?**  
Не включайте все skills сразу. Используйте `context-loading` и один domain skill.

**Где ponytail?**  
В `core/09-implementation-efficiency.mdc` — минимальный diff внутри утверждённой архитектуры.

---

## 8. Что дальше

Phase 24 in progress — scaffold готов. Следующая реализация:

1. Catalog (products API + listing)  
2. Auth  
3. Cart + Checkout + Stripe  

Команда AI уже настроена — начинайте с `/implement-catalog-feature`.
