# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Калькулятор калорий

Калькулятор индекса массы тела и дневной нормы калорий, с дневником питания. Работает как обычный сайт и как Telegram Mini App (WebApp), с общим бэкендом на Vercel Functions для соцфункций ("Лента") и Telegram-напоминаний.

## Как должно выглядеть

- Переключатель на светлую и темную тему, два акцентных цвета (с учетом цвета темы)
- Для оформления используй shadcn.
- Хорошо открывается на телефоне.

## Договоренности
- Объясняй изменения простыми словами.
- Большие правки сначала показывай планом, потом делай.

## Как проверять
- Для роста 175 и веса 72 индекс массы тела около 23.5, категория «норма».

## Технологии и запуск
- Frontend: React + TypeScript + Vite, оформление через **shadcn/ui** (Tailwind CSS, style `new-york`, base color `slate`).
- Backend: Vercel Serverless Functions (`api/`, `@vercel/node`) + Supabase (Postgres) + Upstash Redis.
- Установка: `npm install`
- Разработка: `npm run dev` (Vite; проксирует `/api/groq/*` на `api.groq.com`, но остальные `/api/*` роуты бэкенда локально не поднимаются — тестировать их нужно через деплой на Vercel)
- Сборка: `npm run build` (`tsc -b && vite build`, готовые файлы в `dist/`)
- Тестов и линтера в проекте нет.

## Архитектура фронтенда

- **Хранение данных пользователя — только `localStorage`**, без бэкенда и без аккаунта/авторизации. Один профиль на устройство. См. `src/hooks/useLocalStorage.ts`.
- `src/App.tsx` — корень: держит всё состояние (`foods`, `diary`, `goalCal`, `macroGoals`, `weightLog`, `adaptiveState`, `settings`) в `useLocalStorage` и раздаёт его вниз через пропсы в пять вкладок (`Tabs` из shadcn):
  - `CalculatorTab` — расчёт нормы калорий/БЖУ и ИМТ (формула Mifflin-St Jeor, `src/lib/calc.ts`).
  - `DiaryTab` — дневник приёмов пищи, трекер воды, вес.
  - `StatsTab` — график калорий за 7 дней, экспорт/импорт JSON.
  - `FoodsTab` — база продуктов (локальная, на 100 г, плюс опциональные `portions`).
  - `FeedTab` — единственная вкладка, обращающаяся к бэкенду (`api/feed/*`).
- Типы данных — `src/lib/types.ts` (`Food`, `Entry`, `Diary`/`DiaryDay`, `MacroGoals`, `AdaptiveState`, `AppSettings` и т.д.) — источник истины для формы данных в localStorage.
- `src/lib/adaptive.ts` — еженедельная адаптивная коррекция TDEE по фактической динамике веса (сравнивает ожидаемое и фактическое изменение веса, корректирует `goalCal`); запускается эффектом в `App.tsx` по `shouldRunAdaptive`.
- `src/hooks/useAutoBackup.ts` — раз в календарный день автоматически скачивает JSON-бэкап данных из localStorage (защита от потери данных без бэкенда).
- **Темы/акценты**: `ThemeProvider` (`src/components/theme-provider.tsx`) переключает класс `.dark` на `<html>` и атрибут `data-accent` (`blue`/`green`); сами CSS-переменные — в `src/index.css`. Внутри Telegram тема синхронизируется с темой клиента Telegram и локальный тумблер темы отключается (`inTelegram` из `useTheme()`); вне Telegram тема хранится в `localStorage`.
- **Telegram Mini App**: `src/hooks/useTelegram.ts` читает `window.Telegram.WebApp` (инициализация, `initData`, `colorScheme`, `chatId` пользователя). Приложение должно нормально работать и как обычная веб-страница вне Telegram.
- **AI-функции** (`src/lib/groq.ts`) — распознавание еды из текста/фото и автозаполнение БЖУ нового продукта через Groq API (OpenAI-совместимый эндпоинт). Запросы идут с фронтенда напрямую на `/api/groq/*`, который в проде переписывается Vercel-рерайтом (`vercel.json`) на `https://api.groq.com/openai/v1/*`, а в dev — прокси Vite (`vite.config.ts`). Ключ — `VITE_GROQ_API_KEY` (клиентский, попадает в бандл — см. эксплуатационные заметки в `tz_calorie_app.md`).

## Архитектура бэкенда (`api/`, Vercel Functions)

- `api/_lib/supabase.ts` — клиент Supabase с сервисным ключом (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), только для серверного кода.
- `api/_lib/redis.ts` — клиент Upstash Redis для списка подписчиков Telegram-напоминаний.
- `api/_lib/tgValidate.ts` — проверка подписи `initData` от Telegram WebApp (HMAC по `TELEGRAM_BOT_TOKEN`) — обязательный шаг для любого эндпоинта, принимающего данные из Mini App.
- `api/feed/*` — лента мотивационных постов: `generate.ts` (по крону раз в 4 часа генерирует посты через Groq и складывает в Supabase, с ротацией старых сгенерированных постов), `posts.ts`, `post.ts`, `react.ts`, `report.ts`, `session.ts` (логирование сессии для DAU/MAU, дергается из `App.tsx`).
- `api/telegram/*` — бот-уведомления: `webhook.ts`, `set-webhook.ts`, `subscribe.ts`, `remind.ts` (крон раз в час).
- `api/water/*` — синхронизация счётчика воды с бэкендом для «умных» напоминаний бота.
- Крон-расписания и рерайт Groq-прокси заданы в `vercel.json`.
- Схема БД — `supabase/schema.sql` (таблицы `posts`, `reactions`, `reports`, `sessions`, `water_sync`, RLS-политики только на чтение). Применяется вручную через Supabase Dashboard → SQL Editor.
- Переменные окружения бэкенда (`TELEGRAM_BOT_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) задаются только в Vercel Project Settings, не в `.env` — см. `.env.example`.

## Прочее
- Полное ТЗ с обоснованиями решений — `tz_calorie_app.md` (стоит читать при работе над соответствующим модулем).
- Алиас `@` → `src/` (настроен в `vite.config.ts` и `tsconfig.app.json`).
