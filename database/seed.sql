-- ============================================================
-- CRK Team Builder - Seed Data
-- Flynn Zipsin - VCE Software Development SAT
--
-- Fills the tables with starting data so the website has
-- something to show. Run order:
--     1. schema.sql        (creates the tables)
--     2. cookies_seed.sql  (the full roster, generated file)
--     3. seed.sql          (this file: the meta team database)
--
-- The cookie roster is NOT in this file - it lives in
-- cookies_seed.sql which is generated from the wiki data by
-- generate_cookie_seed.js (see README).
--
-- NOTE: this file no longer seeds sample users or community
-- builds. Real accounts are created through sign-up, and the
-- community builds are added by logged-in users, so those
-- tables start EMPTY on purpose. Only the meta team database
-- (my curated counters, FR03) is seeded here.
-- ============================================================

-- Wipe existing rows first so seeding twice doesn't double up.
-- (cookies is left alone here - cookies_seed.sql manages it.)
TRUNCATE build_likes, user_builds, meta_teams, users
    RESTART IDENTITY CASCADE;


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
