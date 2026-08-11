-- ============================================================
-- CRK Team Builder - Migration: multi-titles, timed/IP bans,
--                                username hold pool, build views
-- Flynn Zipsin - VCE Software Development SAT
--
-- Adds columns and tables without deleting anything, so it is
-- safe on the live database.
--   Local: psql -d crk_team_builder -f migration_titles.sql
--   Live:  NEON_URL=... python3 neon_load.py migration_titles.sql
-- ============================================================


-- ---- 1. Multiple titles per account -------------------------
-- Titles are now a LIST of {name, color} objects rather than one
-- string, so somebody can be both "Content Creator" and "OG", and
-- so an owner can pick any colour they want for a custom title.
-- Stored as JSONB because it's always read and written whole -
-- the database never needs to search inside it.
--
-- The old title column stays for now with its data copied across,
-- so anything still reading it keeps working.
ALTER TABLE users ADD COLUMN IF NOT EXISTS titles JSONB NOT NULL DEFAULT '[]'::jsonb;

-- back-fill existing titles into the new list (with their old
-- inferred colour, which was cyan for admin, teal for OG, etc.)
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

-- Titles now decide what people can do (Owner title -> owner
-- powers). Anyone who was already an owner or admin under the
-- OLD role column gets the matching title so nothing breaks.
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


-- ---- 2. Timed + IP bans -------------------------------------
-- banned_until: when the ban lifts (NULL = permanent).
-- Login treats "now >= banned_until" as un-banned. That way a
-- ban expires without anyone having to do anything.
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;

-- A separate table so ONE IP blocks EVERY account signing in from
-- there - which is the whole point of an IP ban (a banned person
-- making a fresh account gets refused at login too).
CREATE TABLE IF NOT EXISTS banned_ips (
    ban_id       SERIAL PRIMARY KEY,
    ip           VARCHAR(64) NOT NULL,
    banned_at    TIMESTAMP DEFAULT NOW(),
    banned_until TIMESTAMP,             -- NULL = permanent
    reason       VARCHAR(200),

    -- one row per ip, so re-banning the same ip UPDATES the row
    CONSTRAINT one_row_per_ip UNIQUE (ip)
);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips (ip);

-- record their last-known IP on every login. Owners use it to see
-- which IP to add to the ban list.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(64);


-- ---- 3. Username hold pool ----------------------------------
-- When somebody renames, their OLD name is held for them for 14
-- days: nobody else can take it, but they can change back to it.
-- After 14 days the hold expires and the name is up for grabs.
CREATE TABLE IF NOT EXISTS username_holds (
    hold_id           SERIAL PRIMARY KEY,
    username_lower    VARCHAR(30) NOT NULL,      -- always lowercase, for case-insensitive lookup
    held_for_user_id  INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at        TIMESTAMP NOT NULL,

    CONSTRAINT one_hold_per_name UNIQUE (username_lower)
);
CREATE INDEX IF NOT EXISTS idx_username_holds_expires ON username_holds (expires_at);

-- Bring back the 3-day rename cooldown. The column already exists
-- (added by migration_profiles.sql), this line is a no-op there.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP;


-- ---- 4. Build view counts -----------------------------------
-- The Community Builds page can now sort by "most viewed", so a
-- build needs a count.  Incremented by the frontend when the
-- detail popup is opened, with a per-browser same-day dedup so a
-- refresh doesn't run the number up.
ALTER TABLE user_builds ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_user_builds_views ON user_builds (views DESC);


-- ---- Check it worked ----------------------------------------
SELECT user_id, username, role, titles
FROM   users
ORDER  BY user_id;
