-- Migration: profile pictures, private builds, release dates.
-- Adds without wiping, so it's safe on the live database.
-- Flynn Zipsin - VCE Software Development SAT

-- 1. profile pictures: a cookie portrait, or an uploaded picture
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar      VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;

-- 2. public / private builds
ALTER TABLE user_builds ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
UPDATE user_builds SET is_public = TRUE WHERE is_public IS NULL;

-- 3. release dates. run cookies_seed.sql after this to fill them in
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS release_date DATE;


-- check it worked
SELECT table_name, column_name, data_type
FROM   information_schema.columns
WHERE  (table_name = 'users'       AND column_name IN ('avatar', 'avatar_data'))
   OR  (table_name = 'user_builds' AND column_name = 'is_public')
   OR  (table_name = 'cookies'     AND column_name = 'release_date')
ORDER  BY table_name, column_name;
