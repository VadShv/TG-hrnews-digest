# HR News Digest — SaaS для HR-дайджест бота

Поисковая машина HR-новостей с автоматизированной рассылкой в Telegram-группу.

**Стек:** Next.js 16 · React 19 · Postgres + pgvector · Prisma · Tailwind v4 · shadcn/ui · kurigram (MTProto) · RSSHub · Cloud.ru LLM (OpenAI-compatible).

## Возможности

- **Гибридный поиск** по корпусу статей: векторный (pgvector, косинус) + полнотекстовый (tsvector, русский) + trigram.
- **Сбор новостей** из RSS-источников через RSSHub (планировщик, авто-эмбеддинг) и из Telegram-каналов (MTProto user-аккаунт).
- **AI-сводки** статей через LLM (OpenAI-compatible endpoint Cloud.ru).
- **Конструктор дайджестов** с предпросмотром, заметками, переупорядочиванием.
- **Реальная рассылка в Telegram** через kurigram (user-аккаунт, подключается из UI: phone → код → 2FA).
- **Авто-отправка по расписанию** (время + частота из настроек бота).
- **Аналитика**: тренд рассылок 14 дней, категории, топ-источники.
- **Авторизация**: один оператор/admin (next-auth + bcrypt).

## Архитектура

```
Caddy :443 → app:3000 (Next.js standalone)
                ├─ node-cron: RSS-поллинг + авто-дайджест + TG-scan + эмбеддинги
                ├─ lib/llm.ts → Cloud.ru OpenAI-compatible (chat + embeddings)
                ├─ fetch http://rsshub:1200/<route>
                └─ http://tg-worker:8001/tg/*  (login flow)
db (Postgres 16 + pgvector + pg_trgm)
rsshub (RSSHub, Node) :1200
tg-worker (Python: FastAPI + kurigram) :8001  ← poll TgJob → post/scan
```

## Быстрый старт (разработка)

```bash
cp .env.example .env
# заполнить DATABASE_URL, NEXTAUTH_SECRET, ADMIN_*, LLM_*, TG_API_ID/HASH, APP_ENCRYPTION_KEY

bun install
bun run db:migrate      # создать миграции + применить
bun run seed            # admin + фиды + настройки
bun run dev             # http://localhost:3000
```

TG-воркер (отдельно):
```bash
cd tg-worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```

## Деплой на ВМ (docker-compose)

### 1. Подготовка окружения

```bash
git clone https://github.com/VadShv/TG-hrnews-digest.git
cd TG-hrnews-digest
cp .env.example .env
```

Заполнить `.env`:

| Переменная | Описание |
|---|---|
| `POSTGRES_USER/PASSWORD/DB` | Доступы к БД (дефолт hrpulse) |
| `NEXTAUTH_SECRET` | 32+ символа случайной строки (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Публичный URL (`https://hr.example.com` или `http://IP`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Логин оператора |
| `LLM_BASE_URL` / `LLM_API_KEY` | OpenAI-compatible endpoint Cloud.ru |
| `LLM_MODEL` / `LLM_EMBED_MODEL` | Модели (chat + embeddings) |
| `EMBED_DIM` | Размерность эмбеддингов (должна совпадать с моделью) |
| `TG_API_ID` / `TG_API_HASH` | Из https://my.telegram.org → API development tools |
| `APP_ENCRYPTION_KEY` | 32 байта (hex 64 символа) для шифрования TG-сессии |
| `CADDY_DOMAIN` | Домен (`hr.example.com`) или `:80` для IP |

### 2. Получить TG_API_ID / TG_API_HASH

1. https://my.telegram.org → «API development tools»
2. Создать приложение (любое имя) → получить `api_id` и `api_hash`
3. Вписать в `.env` (`TG_API_ID`, `TG_API_HASH`)

### 3. Запуск

```bash
docker compose up -d --build
docker compose logs -f app   # ждать "Ready" и "[bootstrap] OK"
```

Приложение доступно по `NEXTAUTH_URL`. Первый вход — `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### 4. Подключение Telegram (из UI)

1. Открыть раздел **Telegram** → ввести номер телефона → получить код в TG → ввести код (+ пароль 2FA, если включён).
2. В разделе **Каналы** добавить Telegram-канал с `target` = `@username` или `-100...` группы.
3. В разделе **Telegram** → «Тестовое сообщение» → проверить доставку в группу.
4. (Опц.) В разделе **Telegram** → добавить TG-каналы для сканирования (источники новостей).

### 5. Настройка авто-рассылки

1. **Источники RSS** → добавить RSSHub-маршруты (напр. `hhru/vacancies`).
2. **Дайджесты** → создать дайджест, добавить статьи, включить «Авто-отправка», выбрать каналы.
3. **Настройки бота** → задать время и частоту рассылки.

## Схема БД

Postgres + pgvector. 12 моделей: `User`, `NewsArticle` (с `embedding vector`, tsvector FTS), `Feed`, `TgChannel`, `TgSession`, `TgJob`, `Digest`, `DigestItem`, `Channel`, `Broadcast`, `BotSetting`, `SearchQuery`.

Миграция: `prisma/migrations/20260823000000_init/migration.sql` (extensions, таблицы, HNSW-индекс, FTS generated column, trigram).

## Структура

```
src/
  app/api/        # REST API (auth-защищено): news, search, digests, feeds, channels, tg, broadcast, stats, settings
  components/views/  # 9 видов: dashboard, search, library, feeds, digests, channels, telegram, broadcasts, settings
  lib/            # db, auth, llm, search, rss, broadcast, scheduler, crypto, bootstrap, hr, format, hooks, store
tg-worker/        # Python: kurigram MTProto + FastAPI + job queue
docker/           # postgres-init.sql
```

## Проверка

```bash
docker compose exec app npx prisma migrate status
docker compose exec tg-worker python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health').read())"
curl http://localhost/api/health
```
