-- ============================================================
-- CRK Team Builder - Migration: follows, titles, rename cooldown
-- Flynn Zipsin - VCE Software Development SAT
--
-- Like migration_profiles.sql, this ADDS things without wiping
-- any data, so it is safe to run on the live database.
--
--   Local:  psql -d crk_team_builder -f migration_social.sql
--   Live:   run over Neon's SQL-over-HTTP API (port 5432 is
--           blocked on my network - see the project log).
-- ============================================================

-- ---- 1. Profile titles --------------------------------------
-- A short badge shown next to someone's name, e.g. 'OG', 'Owner',
-- 'Admin'. Only an admin can set it (checked in the backend), so
-- players can't award themselves one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(20);


-- ---- 2. Username change cooldown ----------------------------
-- Records WHEN the username was last changed. The backend refuses
-- another change within 3 days, because a profile lives at
-- /u/<username> - every rename breaks the old link, so this stops
-- someone's address changing constantly.
--
-- Existing accounts get NULL, which the backend reads as "never
-- changed", so nobody is locked out by this migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP;


-- ---- 3. Follows ---------------------------------------------
-- One row per "A follows B" relationship.
--
--   follower_id  = the person doing the following
--   following_id = the person being followed
--
-- Two rules are enforced by the DATABASE, not just by code:
--   * UNIQUE (follower_id, following_id) - you can't follow the
--     same person twice, the same idea as build_likes.
--   * no_self_follow - you can't follow yourself.
-- Both ON DELETE CASCADE, so deleting an account tidies up every
-- follow that pointed at it.
CREATE TABLE IF NOT EXISTS follows (
    follow_id    SERIAL PRIMARY KEY,
    follower_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_follow_per_pair UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Counting "how many followers does B have" and "who does A
-- follow" are the two questions the profile page asks every time,
-- so both columns get an index.
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows (follower_id);


-- ---- Check it worked ----------------------------------------
SELECT table_name, column_name, data_type
FROM   information_schema.columns
WHERE  (table_name = 'users'   AND column_name IN ('title', 'username_changed_at'))
   OR   table_name = 'follows'
ORDER  BY table_name, column_name;
