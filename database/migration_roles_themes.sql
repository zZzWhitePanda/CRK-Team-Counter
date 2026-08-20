-- Migration: roles, bans and saved themes.
-- Flynn Zipsin - VCE Software Development SAT

-- 1. roles: user, admin or owner. replaces the old is_admin flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'user';

-- drop first so re-running is safe
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD  CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'owner'));

-- carry over the existing admins
UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role = 'user';

-- user 1 is the site owner
UPDATE users SET role = 'owner', is_admin = TRUE WHERE user_id = 1;


-- 2. bans. the account stays, login just refuses them
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at  TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(200);


-- 3. the rename cooldown column is left but no longer used


-- 4. themes. JSONB because a theme is always read and written whole
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme JSONB;

-- saved presets, one row each. names must be unique per user
CREATE TABLE IF NOT EXISTS user_themes (
    theme_id   SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name       VARCHAR(40) NOT NULL,
    theme      JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_theme_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_themes_user ON user_themes (user_id);


-- check it worked
SELECT user_id, username, role, is_admin, banned_at FROM users ORDER BY user_id;
