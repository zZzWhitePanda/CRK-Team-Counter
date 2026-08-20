-- CRK Team Builder - Database Schema
-- Flynn Zipsin - VCE Software Development SAT
-- Creates every table. Re-running wipes and rebuilds them.

DROP TABLE IF EXISTS build_likes;
DROP TABLE IF EXISTS user_builds;
DROP TABLE IF EXISTS meta_teams;
DROP TABLE IF EXISTS cookies;
DROP TABLE IF EXISTS users;


-- users. passwords are stored hashed, never as plain text
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,           -- auto-numbered ID
    username      VARCHAR(30)  UNIQUE NOT NULL, -- shown next to their builds
    email         VARCHAR(255) UNIQUE NOT NULL, -- used to log in
    password_hash VARCHAR(255) NOT NULL,        -- hashed password, never plain text
    is_admin      BOOLEAN DEFAULT FALSE,        -- TRUE = can edit meta_teams
    -- picture option 1: a cookie portrait filename
    avatar        VARCHAR(100),
    -- picture option 2: an uploaded picture, as a data URI.
    -- kept in the database because the free hosting wipes its disk
    avatar_data   TEXT,
    -- a badge next to their name, set by an admin
    title         VARCHAR(20),
    -- when they last renamed, for the cooldown
    username_changed_at TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
);


-- cookies. the full roster (FR01), loaded by cookies_seed.sql
CREATE TABLE cookies (
    cookie_id  SERIAL PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'Shadow Milk Cookie'
    type       VARCHAR(20) NOT NULL,         -- Charge, Defense, Magic, Ambush, etc.
    position   VARCHAR(10) NOT NULL,         -- Front, Middle or Rear
    rarity     VARCHAR(20) NOT NULL,         -- Common up to Beast
    image_file VARCHAR(100),                 -- portrait in assets/cookie-images/
    -- release date, used by the release order sort
    release_date DATE,

    -- the detail popup fields, scraped from the wiki by
    -- scrape_cookie_details.js. elements is an array because a few
    -- cookies carry more than one, and empty for older cookies
    elements TEXT[] NOT NULL DEFAULT '{}',
    recommended_toppings TEXT[] NOT NULL DEFAULT '{}',
    skill_name TEXT,
    skill_cooldown TEXT,
    skill_description TEXT,
    quote TEXT,
    description TEXT,
    traits TEXT,
    voice_actor TEXT,

    -- CHECK rules so only valid values can be saved
    CONSTRAINT valid_type CHECK
        (type IN ('Charge','Defense','Magic','Ambush','Support',
                  'Bomber','Ranged','Healing','BTS')),
    CONSTRAINT valid_position CHECK
        (position IN ('Front','Middle','Rear')),
    CONSTRAINT valid_rarity CHECK
        (rarity IN ('Common','Rare','Special','Epic','Super Epic',
                    'Dragon','Legendary','Ancient','Beast','Witch'))
);


-- meta_teams, the admin-maintained counter database (SRS 6.7).
-- the cookie lists are arrays so the lookup can ignore order
CREATE TABLE meta_teams (
    meta_team_id SERIAL PRIMARY KEY,
    team_name    VARCHAR(100) NOT NULL,     -- a label like 'Shadow Milk Burst Comp'
    team_cookies TEXT[] NOT NULL,           -- the 5 cookies in MY team
    gear_setup   JSONB,                     -- cookie name -> gear type
    counters     TEXT[] NOT NULL,           -- the enemy cookies this team beats
    win_rate     NUMERIC(5,2) NOT NULL,     -- e.g. 78.50
    created_at   TIMESTAMP DEFAULT NOW(),

    -- 0 to 100
    CONSTRAINT valid_win_rate CHECK (win_rate >= 0 AND win_rate <= 100),

    -- a team is 1 to 5 cookies
    CONSTRAINT team_size CHECK
        (array_length(team_cookies, 1) BETWEEN 1 AND 5)
);


-- user_builds, the community-submitted counter teams (FR05).
-- likes is kept on the row so sorting by likes is fast (FR07)
CREATE TABLE user_builds (
    build_id      SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(user_id)
                      ON DELETE CASCADE,   -- if a user is deleted, their builds go too
    opponent_team TEXT[] NOT NULL,         -- the enemy team this build counters
    counter_team  TEXT[] NOT NULL,         -- the team the player should use
    gear_setup    JSONB,                   -- cookie name -> gear type
    note          VARCHAR(1000),           -- 'how this team works' (max 1000 chars, FR05)
    likes         INTEGER DEFAULT 0,       -- kept up to date by the backend (FR07)
    -- TRUE = public, FALSE = only the owner can see it
    is_public     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),

    CONSTRAINT opponent_team_size CHECK
        (array_length(opponent_team, 1) BETWEEN 1 AND 5),
    CONSTRAINT counter_team_size CHECK
        (array_length(counter_team, 1) BETWEEN 1 AND 5)
);


-- build_likes, one row per like. UNIQUE stops double-liking (FR06)
CREATE TABLE build_likes (
    like_id  SERIAL PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
    build_id INTEGER NOT NULL REFERENCES user_builds(build_id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_like_per_user_per_build UNIQUE (user_id, build_id)
);


-- follows, one row per "A follows B".
-- the database blocks following twice or following yourself
CREATE TABLE follows (
    follow_id    SERIAL PRIMARY KEY,
    follower_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT one_follow_per_pair UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);


-- indexes, to keep lookups fast (NFR02, NFR08).
-- GIN is the index type Postgres uses for arrays
CREATE INDEX idx_meta_teams_counters   ON meta_teams  USING GIN (counters);
CREATE INDEX idx_user_builds_opponent  ON user_builds USING GIN (opponent_team);
CREATE INDEX idx_user_builds_likes     ON user_builds (likes DESC);
CREATE INDEX idx_cookies_elements      ON cookies    USING GIN (elements);

-- both are read on every profile page
CREATE INDEX idx_follows_following     ON follows (following_id);
CREATE INDEX idx_follows_follower      ON follows (follower_id);
