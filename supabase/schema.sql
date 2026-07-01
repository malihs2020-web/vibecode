-- Запусти этот файл в Supabase Dashboard → SQL Editor → New query

-- Посты ленты
CREATE TABLE IF NOT EXISTS posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text         TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  goal_tag     TEXT        NOT NULL CHECK (goal_tag IN ('lose', 'gain', 'universal')),
  author_tg_id TEXT,
  author_name  TEXT        NOT NULL DEFAULT 'Аноним',
  is_generated BOOLEAN     NOT NULL DEFAULT false,
  is_hidden    BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_feed_idx ON posts (created_at DESC) WHERE NOT is_hidden;

-- Реакции (одна на пользователя на пост)
CREATE TABLE IF NOT EXISTS reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_tg_id  TEXT        NOT NULL,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_tg_id)
);

-- Жалобы
CREATE TABLE IF NOT EXISTS reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  reporter_tg_id  TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_tg_id)
);

-- Сессии (DAU/MAU)
CREATE TABLE IF NOT EXISTS sessions (
  tg_id        TEXT        PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Синхронизация счётчика воды (для умных напоминаний бота)
CREATE TABLE IF NOT EXISTS water_sync (
  tg_id TEXT NOT NULL,
  date  DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT  NOT NULL DEFAULT 0,
  goal  INT  NOT NULL DEFAULT 8,
  PRIMARY KEY (tg_id, date)
);

-- RLS
ALTER TABLE posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_sync  ENABLE ROW LEVEL SECURITY;

-- Публичное чтение постов (только не скрытые)
CREATE POLICY "posts_public_read"     ON posts     FOR SELECT USING (NOT is_hidden);
CREATE POLICY "reactions_public_read" ON reactions FOR SELECT USING (true);
