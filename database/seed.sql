-- CRK Team Builder - Seed Data
-- Flynn Zipsin - VCE Software Development SAT
-- Fills in the meta teams. Run after schema.sql and cookies_seed.sql.
-- Users and community builds start empty on purpose.

-- clear first so seeding twice doesn't double up
TRUNCATE build_likes, user_builds, meta_teams, users
    RESTART IDENTITY CASCADE;


-- meta teams (FR03). counters = the enemy cookies this team beats
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
