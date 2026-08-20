-- Migration: multiple titles, timed and IP bans, held usernames,
-- and build view counts. Flynn Zipsin - VCE Software Development SAT


-- 1. titles become a list of {name, color}, so people can have several
ALTER TABLE users ADD COLUMN IF NOT EXISTS titles JSONB NOT NULL DEFAULT '[]'::jsonb;

-- copy the old titles across
UPDATE users
SET titles = jsonb_build_array(jsonb_build_object(
    'name', title,
    'color', CASE lower(title)
        WHEN 'owner'   THEN '#000000'
        WHEN 'admin'   THEN '#22D3EE'
        WHEN 'mod'     THEN '#A78BFA'
        WHEN 'og'      THEN '#F0C24A'
        WHEN 'content creator' THEN '#EF4444'
        ELSE '#8B7CF6'
    END))
WHERE title IS NOT NULL AND jsonb_array_length(titles) = 0;

-- titles now decide permissions, so give staff the matching title
UPDATE users
SET titles = titles || jsonb_build_array(
    jsonb_build_object('name', 'Owner', 'color', '#000000'))
WHERE role = 'owner'
  AND NOT (titles @> '[{"name": "Owner"}]');

UPDATE users
SET titles = titles || jsonb_build_array(
    jsonb_build_object('name', 'Admin', 'color', '#22D3EE'))
WHERE role = 'admin'
  AND NOT (titles @> '[{"name": "Admin"}]');


-- 2. timed bans. banned_until is when it lifts, NULL is permanent
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;

-- IP bans block every account signing in from that address
CREATE TABLE IF NOT EXISTS banned_ips (
    ban_id       SERIAL PRIMARY KEY,
    ip           VARCHAR(64) NOT NULL,
    banned_at    TIMESTAMP DEFAULT NOW(),
    banned_until TIMESTAMP,             -- NULL = permanent
    reason       VARCHAR(200),

    -- one row per ip
    CONSTRAINT one_row_per_ip UNIQUE (ip)
);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips (ip);

-- their last IP, so an owner knows what to ban
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(64);


-- 3. after a rename the old name is held for 14 days
CREATE TABLE IF NOT EXISTS username_holds (
    hold_id           SERIAL PRIMARY KEY,
    username_lower    VARCHAR(30) NOT NULL,      -- always lowercase, for case-insensitive lookup
    held_for_user_id  INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at        TIMESTAMP NOT NULL,

    CONSTRAINT one_hold_per_name UNIQUE (username_lower)
);
CREATE INDEX IF NOT EXISTS idx_username_holds_expires ON username_holds (expires_at);

-- the rename cooldown column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP;


-- 4. view counts, so builds can be sorted by most viewed
ALTER TABLE user_builds ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_user_builds_views ON user_builds (views DESC);


-- check it worked
SELECT user_id, username, role, titles
FROM   users
ORDER  BY user_id;
