-- ============================================================
-- CRK Team Builder - Migration: roles, bans, saved themes
-- Flynn Zipsin - VCE Software Development SAT
--
-- Adds without wiping, so it is safe on the live database.
--   Local: psql -d crk_team_builder -f migration_roles_themes.sql
--   Live:  over Neon's SQL-over-HTTP API (5432 is blocked here).
-- ============================================================

-- ---- 1. Roles ------------------------------------------------
-- Replaces the old is_admin true/false with three levels, because
-- "admin" and "owner" are no longer the same thing:
--
--   user   - a normal player
--   admin  - can delete any community build (moderation)
--   owner  - everything an admin can do, PLUS award titles, ban
--            accounts, and promote/demote admins
--
-- is_admin is KEPT and kept in step with role, so any older code
-- reading it still behaves. role is the one that decides things.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'user';

-- Postgres has no "ADD CONSTRAINT IF NOT EXISTS", so drop first -
-- that makes re-running this file safe.
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD  CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'owner'));

-- anyone who was already an admin becomes one under the new system
UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role = 'user';

-- user_id 1 is the first account ever created - the site owner.
UPDATE users SET role = 'owner', is_admin = TRUE WHERE user_id = 1;


-- ---- 2. Bans -------------------------------------------------
-- A ban doesn't delete the account (that would take their builds
-- with it). It stamps a date, and the login route refuses anyone
-- who has one. Un-banning is just setting these back to NULL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at  TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(200);


-- ---- 3. The username change cooldown is no longer needed ------
-- Profiles now live at /u/<user_id> instead of /u/<username>, so
-- renaming no longer breaks anyone's link and there's nothing to
-- protect against. The column is left in place (dropping it would
-- lose data for no gain) but nothing reads it any more.


-- ---- 4. Themes -----------------------------------------------
-- The theme someone is currently using. JSONB because a theme is a
-- small bundle of settings (colours, background image, name) that
-- is always read and written as a whole - the database never needs
-- to search inside it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme JSONB;

-- Themes a player has saved to re-use later. One row per saved
-- preset, so somebody can keep several and switch between them.
-- The UNIQUE rule stops two of their presets sharing a name.
CREATE TABLE IF NOT EXISTS user_themes (
    theme_id   SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name       VARCHAR(40) NOT NULL,
    theme      JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_theme_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_themes_user ON user_themes (user_id);


-- ---- Check it worked -----------------------------------------
SELECT user_id, username, role, is_admin, banned_at FROM users ORDER BY user_id;
