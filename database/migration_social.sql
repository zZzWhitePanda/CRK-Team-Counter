-- Migration: follows, titles and the rename cooldown.
-- Flynn Zipsin - VCE Software Development SAT

-- 1. profile titles, a badge next to someone's name
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(20);


-- 2. when the username was last changed, for the rename cooldown
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP;


-- 3. follows, one row per "A follows B".
-- the database blocks following twice or following yourself
CREATE TABLE IF NOT EXISTS follows (
    follow_id    SERIAL PRIMARY KEY,
    follower_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_follow_per_pair UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- both columns are read on every profile page
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows (follower_id);


-- check it worked
SELECT table_name, column_name, data_type
FROM   information_schema.columns
WHERE  (table_name = 'users'   AND column_name IN ('title', 'username_changed_at'))
   OR   table_name = 'follows'
ORDER  BY table_name, column_name;
