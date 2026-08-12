-- ============================================================
-- CRK Team Builder - Migration: general-purpose builds
-- Flynn Zipsin - VCE Software Development SAT
--
-- Some people just want to post the team they run against
-- EVERYONE, not a counter to one specific enemy team. That means
-- opponent_team has to be allowed to be empty.
--
-- The old rule was "1 to 5 cookies". Note that in Postgres
-- array_length() on an empty array returns NULL, not 0 - so the
-- old CHECK failed on an empty array rather than passing. The new
-- rule uses cardinality(), which correctly returns 0, and allows
-- anything from 0 to 5.
--
--   Local: psql -d crk_team_builder -f migration_general_builds.sql
--   Live:  NEON_URL=... python3 neon_load.py migration_general_builds.sql
-- ============================================================

ALTER TABLE user_builds DROP CONSTRAINT IF EXISTS opponent_team_size;
ALTER TABLE user_builds ADD  CONSTRAINT opponent_team_size
    CHECK (cardinality(opponent_team) BETWEEN 0 AND 5);

-- The counter team is still required - a build with no team in it
-- would be meaningless - so that rule only moves to cardinality()
-- for consistency.
ALTER TABLE user_builds DROP CONSTRAINT IF EXISTS counter_team_size;
ALTER TABLE user_builds ADD  CONSTRAINT counter_team_size
    CHECK (cardinality(counter_team) BETWEEN 1 AND 5);


-- ---- Check it worked ----------------------------------------
SELECT conname, pg_get_constraintdef(oid) AS rule
FROM   pg_constraint
WHERE  conrelid = 'user_builds'::regclass
  AND  conname IN ('opponent_team_size', 'counter_team_size');
