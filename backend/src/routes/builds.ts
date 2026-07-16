// ============================================================
// routes/builds.ts - community counter teams (FR05/FR06/FR07/FR08).
//
// GET  /api/builds/top          most-liked builds (public)
// POST /api/builds              submit a build      (login required)
// POST /api/builds/:id/like     like / unlike       (login required)
//
// When a logged-in user calls these, each build also comes back
// with "likedByMe" so the heart can show filled or empty.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth, optionalAuth } from '../auth';

export const buildsRouter = Router();

// Adds a "likedByMe" flag to each build for the current user.
// Runs one small query instead of one per build.
async function markLiked(builds: { build_id: number; likedByMe?: boolean }[], userId: number | undefined) {
    if (!userId || builds.length === 0) return builds;
    const ids = builds.map(b => b.build_id);
    const liked = await query(
        `SELECT build_id FROM build_likes WHERE user_id = $1 AND build_id = ANY($2)`,
        [userId, ids]
    );
    const likedSet = new Set(liked.rows.map(r => r.build_id));
    for (const b of builds) b.likedByMe = likedSet.has(b.build_id);
    return builds;
}

// ---- TOP BUILDS (public, FR08) ----
buildsRouter.get('/top', optionalAuth, async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT b.build_id, u.username, b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes, b.created_at
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             ORDER BY b.likes DESC, b.created_at DESC
             LIMIT 20`
        );
        res.json(await markLiked(result.rows, req.user?.userId));
    } catch (err) {
        console.error('GET /api/builds/top failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the builds.' });
    }
});

// ---- SUBMIT A BUILD (login required, FR05) ----
buildsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const opponentTeam = req.body.opponentTeam;
        const counterTeam = req.body.counterTeam;
        const gearSetup = req.body.gearSetup ?? {};
        const note = String(req.body.note ?? '').trim();

        // validate both teams are arrays of 1-5 cookie names
        const okTeam = (t: unknown) =>
            Array.isArray(t) && t.length >= 1 && t.length <= 5 &&
            t.every(c => typeof c === 'string' && c.trim() !== '');

        if (!okTeam(opponentTeam)) {
            res.status(400).json({ error: 'Pick 1-5 enemy cookies.' });
            return;
        }
        if (!okTeam(counterTeam)) {
            res.status(400).json({ error: 'Pick 1-5 cookies for your counter team.' });
            return;
        }
        if (note.length > 1000) {   // FR05: note max 1000 chars
            res.status(400).json({ error: 'Your note is too long (max 1000 characters).' });
            return;
        }

        const result = await query(
            `INSERT INTO user_builds (user_id, opponent_team, counter_team, gear_setup, note)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING build_id, opponent_team, counter_team, gear_setup, note, likes, created_at`,
            [req.user!.userId, opponentTeam, counterTeam, JSON.stringify(gearSetup), note || null]
        );

        // return it with the author's username attached
        res.status(201).json({ ...result.rows[0], username: req.user!.username, likedByMe: false });

    } catch (err) {
        console.error('POST /api/builds failed:', err);
        res.status(500).json({ error: 'Something went wrong saving your build.' });
    }
});

// ---- LIKE / UNLIKE A BUILD (login required, FR06/FR07) ----
buildsRouter.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
    try {
        const buildId = Number(req.params.id);
        const userId = req.user!.userId;
        if (!Number.isInteger(buildId)) {
            res.status(400).json({ error: 'Invalid build.' });
            return;
        }

        // Have they already liked it? If so, this click un-likes.
        const existing = await query(
            `SELECT 1 FROM build_likes WHERE user_id = $1 AND build_id = $2`,
            [userId, buildId]
        );

        let likedByMe: boolean;
        if (existing.rows.length > 0) {
            await query(`DELETE FROM build_likes WHERE user_id = $1 AND build_id = $2`, [userId, buildId]);
            likedByMe = false;
        } else {
            // the UNIQUE rule on (user_id, build_id) is the real
            // guard against double-liking (FR06); this is the happy path
            await query(`INSERT INTO build_likes (user_id, build_id) VALUES ($1, $2)`, [userId, buildId]);
            likedByMe = true;
        }

        // FR07: recount the likes and save the new total on the build
        const recount = await query(
            `UPDATE user_builds
             SET likes = (SELECT COUNT(*) FROM build_likes WHERE build_id = $1)
             WHERE build_id = $1
             RETURNING likes`,
            [buildId]
        );
        if (recount.rows.length === 0) {
            res.status(404).json({ error: 'That build no longer exists.' });
            return;
        }

        res.json({ likes: recount.rows[0].likes, likedByMe });

    } catch (err) {
        console.error('POST /api/builds/:id/like failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});
