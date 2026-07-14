-- ============================================================
-- CRK Team Builder - Database Schema
-- Flynn Zipsin - VCE Software Development SAT
--
-- This file creates all the tables for the website.
-- Run it with:  psql -d crk_team_builder -f schema.sql
--
-- The DROP statements at the top mean I can re-run this file
-- whenever I change the schema - it wipes the old tables and
-- builds fresh ones. (Order matters: tables that other tables
-- point at have to be dropped last.)
-- ============================================================

DROP TABLE IF EXISTS build_likes;
DROP TABLE IF EXISTS user_builds;
DROP TABLE IF EXISTS meta_teams;
DROP TABLE IF EXISTS cookies;
DROP TABLE IF EXISTS users;


-- ------------------------------------------------------------
-- users
-- Holds everyone who can log in. Normal users can submit teams
-- and like them. Admins (just me for now) can also manage the
-- meta database, so there is an is_admin flag (FR from SRS 1.1).
-- The password is NEVER stored as plain text - the backend will
-- hash it first and only the hash goes in here.
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,           -- auto-numbered ID
    username      VARCHAR(30)  UNIQUE NOT NULL, -- shown next to their builds
    email         VARCHAR(255) UNIQUE NOT NULL, -- used to log in
    password_hash VARCHAR(255) NOT NULL,        -- hashed password, never plain text
    is_admin      BOOLEAN DEFAULT FALSE,        -- TRUE = can edit meta_teams
    created_at    TIMESTAMP DEFAULT NOW()
);


-- ------------------------------------------------------------
-- cookies
-- The full roster of cookies. This table fills the drop-down
-- menus on the Counter Tool page and the roster on the Cookies
-- page (FR01). The type/position/rarity columns are what the
-- Cookies page filters on (see mockup 3).
--
-- The roster itself is loaded from cookies_seed.sql, which is
-- GENERATED from cookie_data.json (scraped from the CRK wiki)
-- by generate_cookie_seed.js. image_file matches a picture in
-- assets/cookie-images/ fetched by download_images.js.
-- ------------------------------------------------------------
CREATE TABLE cookies (
    cookie_id  SERIAL PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'Shadow Milk Cookie'
    type       VARCHAR(20) NOT NULL,         -- Charge, Defense, Magic, Ambush, etc.
    position   VARCHAR(10) NOT NULL,         -- Front, Middle or Rear
    rarity     VARCHAR(20) NOT NULL,         -- Common up to Beast
    image_file VARCHAR(100),                 -- portrait in assets/cookie-images/

    -- CHECK rules so bad data can't sneak in - Postgres rejects
    -- any row where these are not one of the allowed values.
    -- (BTS is the collab idol type; Dragon/Witch are rarities
    -- the wiki lists that my original SRS table didn't have.)
    CONSTRAINT valid_type CHECK
        (type IN ('Charge','Defense','Magic','Ambush','Support',
                  'Bomber','Ranged','Healing','BTS')),
    CONSTRAINT valid_position CHECK
        (position IN ('Front','Middle','Rear')),
    CONSTRAINT valid_rarity CHECK
        (rarity IN ('Common','Rare','Special','Epic','Super Epic',
                    'Dragon','Legendary','Ancient','Beast','Witch'))
);


-- ------------------------------------------------------------
-- meta_teams
-- The teams I maintain as the admin, based on the current meta.
-- The important design decision (from SRS 6.7) is that the
-- cookie lists are stored as Postgres ARRAYS (TEXT[]). That
-- lets the lookup use the "contains" operator @> which checks
-- whether one list sits inside another NO MATTER WHAT ORDER
-- the cookies were picked in. Example:
--     WHERE counters @> ARRAY['Hollyberry Cookie','Pure Vanilla Cookie']
-- matches any team whose counters list includes both of those,
-- in any order.
--
-- gear_setup is JSONB - a small lookup of cookie name -> gear,
-- e.g. {"Shadow Milk Cookie": "Swift Chocolate"}. JSONB is used
-- because the pseudocode needs to look up gear BY cookie name
-- (team.gear_setup[cookie]) for the gear-match bonus (FR02).
-- ------------------------------------------------------------
CREATE TABLE meta_teams (
    meta_team_id SERIAL PRIMARY KEY,
    team_name    VARCHAR(100) NOT NULL,     -- a label like 'Shadow Milk Burst Comp'
    team_cookies TEXT[] NOT NULL,           -- the 5 cookies in MY team
    gear_setup   JSONB,                     -- cookie name -> gear type
    counters     TEXT[] NOT NULL,           -- the enemy cookies this team beats
    win_rate     NUMERIC(5,2) NOT NULL,     -- e.g. 78.50
    created_at   TIMESTAMP DEFAULT NOW(),

    -- win rate must be a real percentage (SRS: 0 to 100)
    CONSTRAINT valid_win_rate CHECK (win_rate >= 0 AND win_rate <= 100),

    -- a team is 1 to 5 cookies, never empty and never more than 5
    CONSTRAINT team_size CHECK
        (array_length(team_cookies, 1) BETWEEN 1 AND 5)
);


-- ------------------------------------------------------------
-- user_builds
-- Community-submitted counter teams (FR05). Each build stores
-- WHO made it (user_id points at the users table), the enemy
-- team it beats, the counter team to use, gear, and a note of
-- up to 1000 characters (checked again by the backend).
--
-- likes is stored as a plain number on the row so sorting by
-- likes is fast (FR07 says the count is re-saved on the team
-- every time someone likes it). The build_likes table below is
-- what stops double-liking.
-- ------------------------------------------------------------
CREATE TABLE user_builds (
    build_id      SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(user_id)
                      ON DELETE CASCADE,   -- if a user is deleted, their builds go too
    opponent_team TEXT[] NOT NULL,         -- the enemy team this build counters
    counter_team  TEXT[] NOT NULL,         -- the team the player should use
    gear_setup    JSONB,                   -- cookie name -> gear type
    note          VARCHAR(1000),           -- 'how this team works' (max 1000 chars, FR05)
    likes         INTEGER DEFAULT 0,       -- kept up to date by the backend (FR07)
    created_at    TIMESTAMP DEFAULT NOW(),

    CONSTRAINT opponent_team_size CHECK
        (array_length(opponent_team, 1) BETWEEN 1 AND 5),
    CONSTRAINT counter_team_size CHECK
        (array_length(counter_team, 1) BETWEEN 1 AND 5)
);


-- ------------------------------------------------------------
-- build_likes
-- One row per like. The UNIQUE rule on (user_id, build_id) is
-- the databases way of enforcing FR06: the same user simply
-- CANNOT like the same build twice - Postgres refuses the
-- second row. This is safer than only checking in code.
-- ------------------------------------------------------------
CREATE TABLE build_likes (
    like_id  SERIAL PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
    build_id INTEGER NOT NULL REFERENCES user_builds(build_id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_like_per_user_per_build UNIQUE (user_id, build_id)
);


-- ------------------------------------------------------------
-- Indexes (NFR02 + NFR08: keep lookups fast as the data grows)
--
-- GIN indexes are the special index type Postgres uses for
-- arrays - they make the @> "contains" checks in the counter
-- lookup fast instead of scanning every row.
-- The likes index keeps "ORDER BY likes DESC" (community
-- results + top teams list) quick.
-- ------------------------------------------------------------
CREATE INDEX idx_meta_teams_counters   ON meta_teams  USING GIN (counters);
CREATE INDEX idx_user_builds_opponent  ON user_builds USING GIN (opponent_team);
CREATE INDEX idx_user_builds_likes     ON user_builds (likes DESC);
