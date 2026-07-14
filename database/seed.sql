-- ============================================================
-- CRK Team Builder - Seed Data
-- Flynn Zipsin - VCE Software Development SAT
--
-- Fills the tables with starting data so the website has
-- something to show. Run order:
--     1. schema.sql        (creates the tables)
--     2. cookies_seed.sql  (the full roster, generated file)
--     3. seed.sql          (this file: users, teams, likes)
--
-- The cookie roster is NOT in this file - it lives in
-- cookies_seed.sql which is generated from the wiki data by
-- generate_cookie_seed.js (see README).
-- ============================================================

-- Wipe existing rows first so seeding twice doesn't double up.
-- TRUNCATE ... RESTART IDENTITY also resets the auto-numbered
-- IDs back to 1 so the test data is predictable.
-- (cookies is left alone here - cookies_seed.sql manages it.)
TRUNCATE build_likes, user_builds, meta_teams, users
    RESTART IDENTITY CASCADE;


-- ------------------------------------------------------------
-- Users
-- NOTE: these password hashes are placeholders. Real accounts
-- get their hash made by the backend (bcrypt) when they sign
-- up. These test accounts can't actually be logged into until
-- the backend exists, which is fine for testing the database.
-- ------------------------------------------------------------
INSERT INTO users (username, email, password_hash, is_admin) VALUES
('flynn_admin',  'admin@example.com',      'PLACEHOLDER_HASH_ADMIN', TRUE),
('SamplePlayer', 'sample@example.com',     'PLACEHOLDER_HASH_1',     FALSE),
('ArenaGrinder', 'grinder@example.com',    'PLACEHOLDER_HASH_2',     FALSE);


-- ------------------------------------------------------------
-- Meta teams (my admin-maintained counter database, FR03)
-- counters = the ENEMY cookies this team is good against.
-- The lookup matches the user's enemy team against this array.
-- ------------------------------------------------------------
INSERT INTO meta_teams (team_name, team_cookies, gear_setup, counters, win_rate) VALUES
(
    'Shadow Milk Burst',
    ARRAY['Shadow Milk Cookie','Frost Queen Cookie','Espresso Cookie',
          'Hollyberry Cookie','Pure Vanilla Cookie'],
    '{"Shadow Milk Cookie": "Swift Chocolate",
      "Frost Queen Cookie": "Searing Raspberry",
      "Espresso Cookie": "Searing Raspberry",
      "Hollyberry Cookie": "Solid Almond",
      "Pure Vanilla Cookie": "Swift Chocolate"}',
    ARRAY['Eternal Sugar Cookie','Mystic Flour Cookie','Pure Vanilla Cookie'],
    78.50
),
(
    'Beast Rush',
    ARRAY['Burning Spice Cookie','Silent Salt Cookie','Shadow Milk Cookie',
          'Eternal Sugar Cookie','Pure Vanilla Cookie'],
    '{"Burning Spice Cookie": "Searing Raspberry",
      "Silent Salt Cookie": "Juicy Apple Jelly",
      "Shadow Milk Cookie": "Swift Chocolate",
      "Eternal Sugar Cookie": "Swift Chocolate",
      "Pure Vanilla Cookie": "Solid Almond"}',
    ARRAY['Hollyberry Cookie','Dark Cacao Cookie','Golden Cheese Cookie'],
    72.25
),
(
    'Anti-Squishy Snipe',
    ARRAY['Black Pearl Cookie','Sorbet Shark Cookie','Sea Fairy Cookie',
          'Cotton Cookie','Pure Vanilla Cookie'],
    '{"Black Pearl Cookie": "Searing Raspberry",
      "Sorbet Shark Cookie": "Juicy Apple Jelly",
      "Sea Fairy Cookie": "Searing Raspberry",
      "Cotton Cookie": "Swift Chocolate",
      "Pure Vanilla Cookie": "Solid Almond"}',
    ARRAY['Frost Queen Cookie','Moonlight Cookie','Espresso Cookie'],
    65.00
);


-- ------------------------------------------------------------
-- Community builds (FR04/FR05) - submitted by the test users.
-- user_id 2 = SamplePlayer, user_id 3 = ArenaGrinder
-- (IDs are predictable because of RESTART IDENTITY above.)
-- ------------------------------------------------------------
INSERT INTO user_builds (user_id, opponent_team, counter_team, gear_setup, note, likes) VALUES
(
    2,
    ARRAY['Eternal Sugar Cookie','Mystic Flour Cookie','Hollyberry Cookie'],
    ARRAY['Shadow Milk Cookie','Burning Spice Cookie','Frost Queen Cookie',
          'Hollyberry Cookie','Pure Vanilla Cookie'],
    '{"Shadow Milk Cookie": "Swift Chocolate",
      "Burning Spice Cookie": "Searing Raspberry"}',
    'Burst them down before the double heals come online. Shadow Milk silence on their healers wins it.',
    14
),
(
    3,
    ARRAY['Eternal Sugar Cookie','Mystic Flour Cookie','Hollyberry Cookie'],
    ARRAY['Silent Salt Cookie','Black Pearl Cookie','Sea Fairy Cookie',
          'Cotton Cookie','Pure Vanilla Cookie'],
    '{"Silent Salt Cookie": "Juicy Apple Jelly",
      "Black Pearl Cookie": "Searing Raspberry"}',
    'Slower but safer than the burst option. Works even at lower promotions.',
    9
),
(
    2,
    ARRAY['Frost Queen Cookie','Espresso Cookie'],
    ARRAY['Sorbet Shark Cookie','Ninja Cookie','Rye Cookie',
          'Cotton Cookie','Angel Cookie'],
    '{"Sorbet Shark Cookie": "Juicy Apple Jelly"}',
    'Budget team, no beasts needed. Snipe the mages before they freeze you.',
    5
);


-- ------------------------------------------------------------
-- Likes (FR06) - who liked which build. The counts above were
-- set by hand for seed data; from here on the backend keeps
-- the likes column in sync every time a row is added here.
-- ------------------------------------------------------------
INSERT INTO build_likes (user_id, build_id) VALUES
(1, 1),  -- flynn_admin liked build 1
(3, 1),  -- ArenaGrinder liked build 1
(2, 2);  -- SamplePlayer liked build 2
