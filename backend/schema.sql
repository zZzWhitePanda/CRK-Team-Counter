-- CRK Counter-Pick Database Schema
-- Run this in your PostgreSQL database

-- Meta team compositions (admin/curated)
CREATE TABLE IF NOT EXISTS meta_teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    characters JSONB NOT NULL,
    gear_setup JSONB,
    counters JSONB,
    win_rate DECIMAL(5,2) DEFAULT 50.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gear configurations
CREATE TABLE IF NOT EXISTS gear_loadouts (
    id SERIAL PRIMARY KEY,
    character VARCHAR(100) NOT NULL,
    recommended_gear JSONB NOT NULL,
    synergy_tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- User-submitted builds
CREATE TABLE IF NOT EXISTS user_builds (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    opponent_team JSONB NOT NULL,
    counter_team JSONB NOT NULL,
    gear_setup JSONB,
    description TEXT,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Voting system
CREATE TABLE IF NOT EXISTS build_votes (
    id SERIAL PRIMARY KEY,
    build_id INT REFERENCES user_builds(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    vote_type VARCHAR(10) CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(build_id, user_id)
);

-- Sample data for testing
INSERT INTO meta_teams (team_name, characters, gear_setup, counters, win_rate) VALUES
('Tank Sustain Meta', 
 '["Dark Cacao", "Financier", "Captain Caviar", "Cream Unicorn", "Eclair"]'::jsonb,
 '{"Dark Cacao": "Swift Chocolate", "Financier": "Solid Almond", "Captain Caviar": "Swift Chocolate"}'::jsonb,
 '["Burst DPS", "Freeze Comp"]'::jsonb,
 68.5),
('Burst DPS', 
 '["Black Pearl", "Oyster", "Financier", "Clotted Cream", "Eclair"]'::jsonb,
 '{"Black Pearl": "Searing Raspberry", "Oyster": "Swift Chocolate", "Financier": "Solid Almond"}'::jsonb,
 '["Tank Sustain Meta"]'::jsonb,
 72.3),
('Freeze Comp', 
 '["Frost Queen", "Sea Fairy", "Cotton", "Financier", "Eclair"]'::jsonb,
 '{"Frost Queen": "Searing Raspberry", "Sea Fairy": "Searing Raspberry", "Cotton": "Swift Chocolate"}'::jsonb,
 '["Debuff Cleanse", "High Resist"]'::jsonb,
 65.8);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_builds_likes ON user_builds(likes DESC);
CREATE INDEX IF NOT EXISTS idx_meta_teams_winrate ON meta_teams(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_build_votes_build_id ON build_votes(build_id);
