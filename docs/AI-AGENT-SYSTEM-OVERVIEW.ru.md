# ИИ-система разработки — подробный обзор

Документ для людей и агентов: как устроена система в этом репозитории и как воссоздать такую же в другом проекте.

Полный переносимый пакет: [`docs/ai-agent-system-bootstrap/`](./ai-agent-system-bootstrap/README.md).

---

## Что это за система

Это не «один чат-бот, который пишет весь код», а **управляемая инженерная команда** внутри Cursor:

| Роль | Кто | Зачем |
|------|-----|-------|
| Вход | `/start-feature` | Принимает бизнес-цель на обычном языке |
| Планировщик | `project-orchestrator` | Строит Feature Plan, **не пишет код** |
| Исполнители | субагенты по доменам | Пишут код в своём scope |
| Маршрутизация моделей | model routing | Дешёвая модель на CRUD, Opus на платежи/архитектуру |
| Контроль качества | `verifier` | Не даёт закрыть задачу «на честном слове» |
| Память между сессиями | `.cursor/project-management/` | Контекст, задачи, решения, handoff |

---

## Как это работает end-to-end

```text
Бизнес-цель
   → context-loading (5 PM-файлов)
   → project-orchestrator → Feature Plan
   → ждем proceed / ok / да
   → subagent-orchestrator (раунды параллельно/последовательно)
   → (для платежей/auth) silent-failure-hunter → diff-reviewer
   → verifier
   → обновление PM-файлов
```

Пока пользователь не подтвердил план, код писать нельзя.

---

## Слои системы (не смешивать)

1. **Rules** (`.cursor/rules/`) — обязательные ограничения («что всегда должно быть правдой»).
2. **Skills** (`.cursor/skills/`) — процедуры («как делать класс задач»).
3. **Agents** (`.cursor/agents/`) — роли («кто владеет доменом и какими skills может пользоваться»).
4. **Workflows** — жизненный цикл фичи.
5. **Project management** — общая память между чатами.
6. **Model routing** — какая модель на какой шаг.
7. **MCP** — внешние инструменты (Postgres, Playwright, Context7…).

Подробно: [`HOW-THE-SYSTEM-WORKS.md`](./ai-agent-system-bootstrap/HOW-THE-SYSTEM-WORKS.md).

---

## Оркестратор

`project-orchestrator`:

- читает PM-состояние;
- классифицирует сложность;
- выбирает **минимальный** набор агентов;
- выдаёт Feature Plan (домены, агенты, модели, раунды, риски);
- ждёт `proceed`;
- **никогда** не пишет application code.

---

## Model routing (суть)

| Модель | Когда |
|--------|-------|
| Composer 2.5 | реализация, тесты, миграции, обычная верификация |
| Grok 4.5 / GPT-5.5 | план, оркестрация, research, docs, DevOps-планирование |
| Opus | архитектура, security, платежи, compliance |

Нельзя сажать Opus на обычный CRUD «на всякий случай».

---

## Главное правило при создании системы в новом проекте

**Сначала skills и домены продукта → потом субагенты.**

Агент обязан:

1. прочитать всю папку skills;
2. сделать inventory (оставить / отложить / отвергнуть);
3. построить карту доменов продукта;
4. сгруппировать skills в ownership-кластеры;
5. вывести roster агентов **под этот продукт**;
6. только после Skills→Agents Report писать `.cursor/agents/*.md`.

Нельзя копировать `catalog-specialist` / `checkout-specialist` из ecommerce, если в новом проекте нет каталога/чекаута.

Алгоритм: [`SKILLS-TO-AGENTS-PIPELINE.md`](./ai-agent-system-bootstrap/SKILLS-TO-AGENTS-PIPELINE.md).  
Эталон этого репо (пример, не шаблон для слепого копирования): [`REFERENCE-IMPLEMENTATION.md`](./ai-agent-system-bootstrap/REFERENCE-IMPLEMENTATION.md).

---

## Как запустить создание системы в другом проекте

1. Скопировать/приложить папку `docs/ai-agent-system-bootstrap/`.
2. Взять промпт из `BOOTSTRAP-PROMPT.md`, вставить логику продукта.
3. Сказать агенту: читать файлы по порядку из README; **не создавать domain-агентов до Skills→Agents Report**.
4. После bootstrap первая команда: `/start-feature …` — должен появиться план и ожидание `proceed`.

Чеклист приёмки: [`VALIDATION-CHECKLIST.md`](./ai-agent-system-bootstrap/VALIDATION-CHECKLIST.md).

---

## Что есть в этом репозитории (ориентир)

Агенты: orchestrator, verifier, architect, backend/frontend/db/api, catalog, checkout (YooKassa), security, qa, devops, silent-failure-hunter, diff-reviewer.

Skills: `start-feature`, `context-loading`, `subagent-orchestrator`, `model-routing`, `skill-router`, доменные skills каталога/чекаута/FastAPI/Next.js/Postgres и др.

Живой гайд команды: [`MASTER-AI-WORKFLOW.md`](./MASTER-AI-WORKFLOW.md).

---

## Минимальный набор файлов новой системы

- `.cursor/agents/project-orchestrator.md`
- `.cursor/agents/verifier.md`
- `.cursor/skills/context-loading/SKILL.md`
- `.cursor/skills/start-feature/SKILL.md`
- `.cursor/skills/subagent-orchestrator/SKILL.md`
- `.cursor/workflows/feature-lifecycle.md`
- `PROJECT_ROADMAP.md` или `docs/PROJECT_PLAN.md`
- `.cursor/project-management/` — 5 файлов состояния
- `docs/MASTER-AI-WORKFLOW.md`

Остальные агенты — только после анализа домена и skills.
