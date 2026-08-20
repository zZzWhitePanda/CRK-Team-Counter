-- Migration: allow an empty opponent team, for builds that work
-- against anything. Flynn Zipsin - VCE Software Development SAT

ALTER TABLE user_builds DROP CONSTRAINT IF EXISTS opponent_team_size;
ALTER TABLE user_builds ADD  CONSTRAINT opponent_team_size
    CHECK (cardinality(opponent_team) BETWEEN 0 AND 5);

-- the counter team is still required
ALTER TABLE user_builds DROP CONSTRAINT IF EXISTS counter_team_size;
ALTER TABLE user_builds ADD  CONSTRAINT counter_team_size
    CHECK (cardinality(counter_team) BETWEEN 1 AND 5);


-- check it worked
SELECT conname, pg_get_constraintdef(oid) AS rule
FROM   pg_constraint
WHERE  conrelid = 'user_builds'::regclass
  AND  conname IN ('opponent_team_size', 'counter_team_size');
