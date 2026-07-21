# Production: local media storage

Пошаговая настройка хранения фото на сервере перед go-live.

---

## 1. Сгенерировать секреты

На сервере или локально:

```bash
chmod +x scripts/generate-production-secrets.sh
./scripts/generate-production-secrets.sh
```

Скопируйте вывод в `.env.production`:

- `JWT_SECRET_KEY` — подпись JWT (storefront + admin middleware)

---

## 2. Локальное хранение медиа

Production хранит фото **на диске API-сервера** в Docker volume `media_uploads`.
Caddy проксирует `https://ВАШ_ДОМЕН/media/*` → FastAPI (`StaticFiles`).

### Переменные `.env.production`

```env
MEDIA_PUBLIC_BASE_URL=https://ВАШ_ДОМЕН/media
MEDIA_UPLOAD_DIR=/app/uploads
# MEDIA_MAX_UPLOAD_BYTES=5242880
```

`docker-compose.prod.yml` монтирует volume:

```yaml
volumes:
  - media_uploads:/app/uploads
```

### Загрузка из админки

Админка отправляет файл на `POST /api/v1/admin/media/upload`.
API сохраняет файл в `/app/uploads` и возвращает публичный URL вида
`https://ВАШ_ДОМЕН/media/{uuid}.jpg`.

### Резервное копирование

Volume `media_uploads` **не входит** в бэкап PostgreSQL.
Настройте периодический бэкап каталога uploads (snapshot VPS, `docker run` backup и т.п.).

### Диск

Следите за свободным местом на VPS. Лимит размера одного файла задаётся
`MEDIA_MAX_UPLOAD_BYTES` (по умолчанию 5 МБ).

---

## 3. Переменные docker-compose.prod.yml

Прокидываются автоматически из `.env.production`:

| Сервис | Переменные |
|--------|------------|
| **api** | `MEDIA_*`, `JWT_SECRET_KEY`, `ADMIN_LOGIN_*`, `ADMIN_MEDIA_UPLOAD_LIMIT_PER_MINUTE` |
| **web** | `JWT_SECRET_KEY` (middleware admin) |

---

## 3.1. Защита admin login (без MFA)

После отказа от MFA (ADR-014) включите компенсирующие меры:

```env
ADMIN_LOGIN_MAX_ATTEMPTS=5
ADMIN_LOGIN_LOCKOUT_MINUTES=15
# Опционально: только с офисного/VPN IP (через запятую)
ADMIN_LOGIN_ALLOWED_IPS=203.0.113.1,203.0.113.2
ADMIN_MEDIA_UPLOAD_LIMIT_PER_MINUTE=20
```

- **Lockout** — после N неверных паролей аккаунт блокируется на M минут (429 + `Retry-After`).
- **IP allowlist** — пустой список = все IP разрешены; иначе только перечисленные.
- **Rate limit upload** — in-process лимит на `POST /admin/media/upload` (на нескольких репликах — per-instance; см. ниже).

`JWT_SECRET_KEY` должен совпадать в **api** и **web** — middleware проверяет claim `is_active: true`.

### Несколько реплик API

In-process rate limit (login + upload) действует **на каждый инстанс отдельно**. Для одного VPS с одним контейнером API этого достаточно. При горизontальном масштабировании:

- используйте sticky sessions на балансировщике **или**
- вынесите rate limit в shared store (Redis) — отдельная задача, не блокирует текущий деплой.

---

```bash
# API config OK
curl -s https://ВАШ_ДОМЕН/health/ready

# Публичная отдача медиа (после загрузки тестового файла)
curl -I https://ВАШ_ДОМЕН/media/ИМЯ_ФАЙЛА.jpg
```

В админке: редактирование товара → загрузка фото → URL должен начинаться с
`https://ВАШ_ДОМЕН/media/`.

---

## 5. Troubleshooting

| Проблема | Решение |
|----------|---------|
| API: `media_public_base_url is required` | Задайте `MEDIA_PUBLIC_BASE_URL=https://DOMAIN/media` |
| API: `media_public_base_url must use https` | Используйте `https://`, не `http://` |
| Upload 422 File too large | Уменьшите файл или увеличьте `MEDIA_MAX_UPLOAD_BYTES` |
| 404 на `/media/...` | Проверьте volume mount и что файл существует в `/app/uploads` |
| Admin middleware 401 после login | `JWT_SECRET_KEY` одинаковый в api и web |
| Фото пропали после `docker compose down -v` | Volume удалён — восстановите из бэкапа |

---

## Связанные файлы

- `.env.production.example` — шаблон переменных
- `docker-compose.prod.yml` — production compose + volume `media_uploads`
- `apps/api/app/core/config.py` — production validators
- `docs/adr/ADR-013-local-server-media-storage.md` — архитектурное решение
- `docs/adr/ADR-014-remove-admin-mfa.md` — отказ от MFA
- `docs/DEPLOY.md` — общий деплой на VPS
