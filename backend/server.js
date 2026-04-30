const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

// Get counter-pick recommendations
app.post('/api/lookup', async (req, res) => {
    const { opponent_team, opponent_gear } = req.body;

    try {
        // Query meta teams that counter this composition
        const metaResult = await pool.query(`
            SELECT * FROM meta_teams
            WHERE counters @> $1::jsonb
            ORDER BY win_rate DESC
            LIMIT 5
        `, [JSON.stringify(opponent_team)]);

        // Query user-submitted builds (top liked)
        const userResult = await pool.query(`
            SELECT * FROM user_builds
            WHERE opponent_team @> $1::jsonb
            ORDER BY likes DESC
            LIMIT 5
        `, [JSON.stringify(opponent_team)]);

        res.json({
            meta_counters: metaResult.rows,
            community_builds: userResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Get all meta teams
app.get('/api/meta-teams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM meta_teams ORDER BY win_rate DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Submit new user build
app.post('/api/submit-build', async (req, res) => {
    const { user_id, opponent_team, counter_team, gear_setup, description } = req.body;

    try {
        const result = await pool.query(`
            INSERT INTO user_builds (user_id, opponent_team, counter_team, gear_setup, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, JSON.stringify(opponent_team), JSON.stringify(counter_team), JSON.stringify(gear_setup), description]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit build', details: err.message });
    }
});

// Get top community builds
app.get('/api/top-builds', async (req, res) => {
    const limit = req.query.limit || 10;
    
    try {
        const result = await pool.query(`
            SELECT * FROM user_builds
            ORDER BY likes DESC
            LIMIT $1
        `, [limit]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Vote on a build
app.post('/api/vote', async (req, res) => {
    const { build_id, user_id, vote_type } = req.body;

    try {
        // Upsert vote
        await pool.query(`
            INSERT INTO build_votes (build_id, user_id, vote_type)
            VALUES ($1, $2, $3)
            ON CONFLICT (build_id, user_id) DO UPDATE SET vote_type = $3
        `, [build_id, user_id, vote_type]);

        // Update like count
        const likeCount = await pool.query(`
            SELECT COUNT(*) as count FROM build_votes
            WHERE build_id = $1 AND vote_type = 'like'
        `, [build_id]);

        await pool.query(`
            UPDATE user_builds SET likes = $1 WHERE id = $2
        `, [likeCount.rows[0].count, build_id]);

        res.json({ success: true, likes: parseInt(likeCount.rows[0].count) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Vote failed', details: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
