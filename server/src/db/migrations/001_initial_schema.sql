-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USERS
-- =====================
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  cf_handle           VARCHAR(100) UNIQUE,
  comfort_zone_rating INTEGER DEFAULT 800,
  current_streak      INTEGER DEFAULT 0,
  longest_streak      INTEGER DEFAULT 0,
  last_synced_at      TIMESTAMP,
  email_digest        BOOLEAN DEFAULT true,
  digest_hour         INTEGER DEFAULT 7,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- =====================
-- SUBMISSIONS
-- =====================
CREATE TABLE submissions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cf_submission_id    BIGINT NOT NULL,
  problem_id          VARCHAR(20) NOT NULL,   -- e.g. "1900A"
  problem_name        VARCHAR(255) NOT NULL,
  rating              INTEGER,                -- null if unrated
  tags                TEXT[] NOT NULL DEFAULT '{}',
  verdict             VARCHAR(50) NOT NULL,   -- "OK", "WRONG_ANSWER", etc.
  submitted_at        TIMESTAMP NOT NULL,
  UNIQUE(user_id, cf_submission_id)           -- no duplicate submissions
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_user_verdict ON submissions(user_id, verdict);
CREATE INDEX idx_submissions_submitted_at ON submissions(user_id, submitted_at DESC);

-- =====================
-- TAG STATS
-- =====================
CREATE TABLE tag_stats (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag             VARCHAR(100) NOT NULL,
  attempted       INTEGER DEFAULT 0,
  solved          INTEGER DEFAULT 0,
  success_rate    DECIMAL(5,4) DEFAULT 0,     -- 0.0000 to 1.0000
  avg_difficulty  INTEGER DEFAULT 0,
  last_solved_at  TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_tag_stats_user_id ON tag_stats(user_id);
CREATE INDEX idx_tag_stats_success_rate ON tag_stats(user_id, success_rate ASC);

-- =====================
-- PROBLEMS CACHE
-- =====================
CREATE TABLE problems (
  cf_problem_id   VARCHAR(20) PRIMARY KEY,    -- "1900A"
  contest_id      INTEGER NOT NULL,
  problem_index   VARCHAR(5) NOT NULL,        -- "A", "B", "C1"
  name            VARCHAR(255) NOT NULL,
  rating          INTEGER,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  solved_count    INTEGER DEFAULT 0,
  cached_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_problems_rating ON problems(rating);
CREATE INDEX idx_problems_tags ON problems USING GIN(tags);  -- GIN for array search

-- =====================
-- DAILY QUEUES
-- =====================
CREATE TABLE daily_queues (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  queue_date      DATE NOT NULL,
  problems        JSONB NOT NULL DEFAULT '[]',
  generated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, queue_date)
);

CREATE INDEX idx_daily_queues_user_date ON daily_queues(user_id, queue_date DESC);

-- =====================
-- SOLVE LOG (for streak + heatmap)
-- =====================
CREATE TABLE solve_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  solved_date     DATE NOT NULL,
  problems_solved INTEGER DEFAULT 0,
  UNIQUE(user_id, solved_date)
);

CREATE INDEX idx_solve_log_user_date ON solve_log(user_id, solved_date DESC);

-- =====================
-- FRIENDSHIPS
-- =====================
CREATE TABLE friendships (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK(user_id != friend_id)               -- can't friend yourself
);