-- ============================================================
-- CRK Team Builder - Migration: profiles + release dates
-- Flynn Zipsin - VCE Software Development SAT
--
-- schema.sql wipes every table, which is fine on my laptop but
-- would delete the real community builds on the live Neon
-- database. This file makes the SAME changes WITHOUT losing any
-- data, so it is the one to run against the live database.
--
--   Local:  psql -d crk_team_builder -f migration_profiles.sql
--           psql -d crk_team_builder -f cookies_seed.sql
--
--   Live:   the local network blocks Neon on port 5432, so run it
--           over Neon's SQL-over-HTTP API instead (see the note in
--           the project log). Same two files, same order.
--
-- IF NOT EXISTS means running this twice is harmless - it just
-- skips anything that is already there.
-- ============================================================

-- ---- 1. Profile pictures ----------------------------------------
-- avatar      = the filename of a cookie portrait picked from the roster
-- avatar_data = a picture the user uploaded, held as a data URI.
-- The image goes in the database because the free Render hosting
-- erases the server's disk on every restart, so an uploaded file
-- would vanish. The browser shrinks each upload to 128x128 first,
-- so a row is only about 15 KB.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar      VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;

-- ---- 2. Public / private builds ---------------------------------
-- The owner flips this from their profile page. TRUE keeps every
-- build that already exists visible, which is how they were posted.
ALTER TABLE user_builds ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
UPDATE user_builds SET is_public = TRUE WHERE is_public IS NULL;

-- ---- 3. Cookie release dates ------------------------------------
-- Powers the "Release order" option in the roster's Sort by menu.
-- The dates themselves are filled in by cookies_seed.sql, which
-- must be run straight after this file.
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS release_date DATE;


-- ---- Check it worked --------------------------------------------
-- Should list avatar, avatar_data, is_public and release_date.
SELECT table_name, column_name, data_type
FROM   information_schema.columns
WHERE  (table_name = 'users'       AND column_name IN ('avatar', 'avatar_data'))
   OR  (table_name = 'user_builds' AND column_name = 'is_public')
   OR  (table_name = 'cookies'     AND column_name = 'release_date')
ORDER  BY table_name, column_name;
