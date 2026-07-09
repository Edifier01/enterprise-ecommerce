# Деплой на один VPS

Инструкция для развёртывания **FastAPI + Next.js + PostgreSQL** на одном сервере с доменом и HTTPS.

## Архитектура

```text
Интернет
   │
   ▼
Caddy (:80 / :443, авто-HTTPS)
   ├── /api/*  →  FastAPI (api:8000)
   ├── /health* → FastAPI
   └── /*      →  Next.js (web:3000)
PostgreSQL (только внутри Docker-сети)
```

Браузер ходит на один домен (`https://ваш-домен.ru`), cookies и CORS работают без лишней настройки.

---

## Требования к серверу

- Ubuntu 22.04+ / Debian 12+ (или аналог)
- Минимум **2 GB RAM** (лучше 4 GB)
- Открыты порты **80** и **443**
- DNS: **A-запись** домена → IP сервера

---

## 1. Подготовка сервера (один раз)

Подключитесь по SSH:

```bash
ssh root@ВАШ_IP
```

Установите Docker:

```bash
apt update && apt install -y git curl
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
```

Перелогиньтесь, чтобы группа `docker` применилась.

Клонируйте репозиторий:

```bash
git clone https://github.com/Edifier01/enterprise-ecommerce.git
cd enterprise-ecommerce
```

---

## 2. Настройка окружения

```bash
cp .env.production.example .env.production
nano .env.production
```

Заполните:

| Переменная | Пример | Описание |
|------------|--------|----------|
| `DOMAIN` | `shop.mydomain.ru` | Ваш домен |
| `ACME_EMAIL` | `you@email.com` | Email для Let's Encrypt |
| `POSTGRES_PASSWORD` | случайная строка | Пароль БД |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` | Секрет JWT |

Сгенерировать JWT-секрет:

```bash
openssl rand -hex 32
```

---

## 3. Первый запуск

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Скрипт:

1. Собирает Docker-образы API и web
2. Запускает PostgreSQL, API, web, Caddy
3. Выполняет миграции Alembic
4. Получает SSL-сертификат через Caddy

Откройте в браузере: `https://ВАШ_ДОМЕН`

Проверка API: `https://ВАШ_ДОМЕН/health`

---

## 4. Заполнить каталог (первый раз)

После успешного деплоя:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec api python -m scripts.seed_dev
```

---

## 5. Обновление после `git push`

На сервере:

```bash
cd enterprise-ecommerce
./scripts/deploy.sh
```

Или настроить GitHub Actions (см. ниже) для автодеплоя по SSH.

---

## 6. Работа из Cursor (локально → сервер)

**Рекомендуемый workflow:**

1. Пишете код локально в Cursor
2. `git push` на GitHub
3. На сервере `./scripts/deploy.sh` (или автоматически через CI)
4. Проверяете `https://ваш-домен.ru`

Локально в `.env.local` можно оставить `localhost` — production не затрагивается.

Для отладки против **живого API** с локального фронта (опционально):

```env
NEXT_PUBLIC_API_URL=https://ваш-домен.ru
```

---

## 7. Stripe webhooks (когда подключите оплату)

URL webhook в Stripe:

```text
https://ВАШ_ДОМЕН/api/v1/webhooks/stripe
```

---

## 8. Полезные команды

```bash
# Статус контейнеров
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Логи API
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# Логи сайта
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web

# Остановить всё
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

---

## 9. Автодеплой через GitHub Actions (опционально)

Добавьте secrets в репозиторий GitHub:

| Secret | Значение |
|--------|----------|
| `DEPLOY_HOST` | IP или hostname сервера |
| `DEPLOY_USER` | SSH-пользователь |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ |

Workflow: `.github/workflows/deploy.yml` (создайте при необходимости).

---

## Безопасность

- Не коммитьте `.env.production`
- Меняйте `JWT_SECRET_KEY` и `POSTGRES_PASSWORD` от dev-значений
- PostgreSQL не публикуется наружу — только внутри Docker
- В production отключены `/docs` и `/redoc` API

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| HTTPS не выдаётся | Проверьте DNS A-запись и порты 80/443 |
| 502 на сайте | `docker compose ... logs web api` |
| Пустой каталог | Запустите `seed_dev` (см. §4) |
| API 503 на `/health/ready` | Подождите миграции; проверьте `logs api` |
