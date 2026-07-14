-- ============================================================
-- CRK Team Builder - Database Tests
-- Flynn Zipsin - VCE Software Development SAT
--
-- Run with:  psql -d crk_team_builder -f test_queries.sql
--
-- These queries prove the schema actually does what the SRS
-- says it should, BEFORE any backend code exists. Each test
-- says what result to expect.
-- ============================================================

\echo '=== TEST 1: roster loads (fills the drop-downs, FR01) ==='
\echo 'Expect: 190 cookies, and 0 missing an image filename'
SELECT COUNT(*) AS cookie_count,
       COUNT(*) FILTER (WHERE image_file IS NULL) AS missing_images
FROM cookies;


\echo '=== TEST 2: counter lookup ignores pick order (SRS 6.7) ==='
\echo 'Enemy picked as [Mystic Flour, Eternal Sugar] - note the'
\echo 'REVERSED order compared to how the meta team was saved.'
\echo 'Expect: Shadow Milk Burst still found, because @> checks'
\echo 'list-contains-list, not exact order.'
SELECT team_name, win_rate
FROM meta_teams
WHERE counters @> ARRAY['Mystic Flour Cookie','Eternal Sugar Cookie']
ORDER BY win_rate DESC
LIMIT 5;


\echo '=== TEST 3: community builds for the same enemy, by likes (FR04) ==='
\echo 'Expect: 2 builds, the 14-like one first'
SELECT build_id, u.username, b.likes, b.note
FROM user_builds b
JOIN users u ON u.user_id = b.user_id
WHERE b.opponent_team @> ARRAY['Eternal Sugar Cookie','Mystic Flour Cookie']
ORDER BY b.likes DESC
LIMIT 5;


\echo '=== TEST 4: partial enemy team still matches (FR01: 1-5 cookies) ==='
\echo 'Searching with only ONE enemy cookie picked.'
\echo 'Expect: both Eternal Sugar builds found'
SELECT build_id, likes
FROM user_builds
WHERE opponent_team @> ARRAY['Eternal Sugar Cookie']
ORDER BY likes DESC;


\echo '=== TEST 5: no match returns zero rows, not an error (FR10) ==='
\echo 'Expect: 0 rows (the site will show the "be the first to'
\echo 'add a team" message when it gets an empty list back)'
SELECT team_name
FROM meta_teams
WHERE counters @> ARRAY['GingerBrave'];


\echo '=== TEST 6: top teams list (FR08) ==='
\echo 'Expect: all builds ordered by likes, newest first on ties'
SELECT build_id, likes, created_at
FROM user_builds
ORDER BY likes DESC, created_at DESC
LIMIT 10;


\echo '=== TEST 7: gear lookup by cookie name (FR02) ==='
\echo 'The gear bonus needs gear_setup[cookie] to work.'
\echo 'Expect: Swift Chocolate'
SELECT gear_setup ->> 'Shadow Milk Cookie' AS shadow_milk_gear
FROM meta_teams
WHERE team_name = 'Shadow Milk Burst';


\echo '=== TEST 8: double-like is BLOCKED by the database (FR06) ==='
\echo 'flynn_admin (user 1) already liked build 1 in the seed.'
\echo 'Expect: ERROR mentioning one_like_per_user_per_build.'
\echo '(An error here is a PASS - the rule is doing its job.)'
INSERT INTO build_likes (user_id, build_id) VALUES (1, 1);


\echo '=== TEST 9: bad win rate is BLOCKED (SRS: 0-100) ==='
\echo 'Expect: ERROR mentioning valid_win_rate. Again, a PASS.'
INSERT INTO meta_teams (team_name, team_cookies, counters, win_rate)
VALUES ('Bad Team', ARRAY['GingerBrave'], ARRAY['Ninja Cookie'], 150);
