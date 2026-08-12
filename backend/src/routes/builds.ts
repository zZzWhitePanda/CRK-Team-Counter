// ============================================================
// routes/builds.ts - community counter teams (FR05/FR06/FR07/FR08).
//
// GET  /api/builds             browse builds with ?sort= (public)
// POST /api/builds             submit a build      (login required)
// POST /api/builds/:id/like    like / unlike       (login required)
// POST /api/builds/:id/view    count a view        (public)
//
// When a logged-in user calls these, each build also comes back
// with "likedByMe" so the heart can show filled or empty.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth, optionalAuth, currentTitles } from '../auth';
import { isMod } from '../permissions';

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

// ---- BROWSE BUILDS (public) ----
// Replaces the old /top endpoint. The order is picked with ?sort=:
//
//   likes    - most liked (default)
//   views    - most viewed
//   newest   - most recent first
//   featured - Content-Creator builds first, then most liked
//
// The old /top URL still points here so any bookmark keeps working.
const SORTS: Record<string, string> = {
    likes:    'b.likes DESC, b.created_at DESC',
    views:    'b.views DESC, b.created_at DESC',
    newest:   'b.created_at DESC',
    // "Featured" sorts creators to the top. `titles @> '[{...}]'`
    // asks Postgres whether that title is in the JSONB array.
    featured: `(u.titles @> '[{"name": "Content Creator"}]') DESC, b.likes DESC, b.created_at DESC`,
};

async function browse(req: Request, res: Response) {
    try {
        const sortKey = String(req.query.sort ?? 'likes');
        // `sortBy` is picked from the fixed SORTS map, NOT built
        // from the query string, so it can't be used to inject SQL
        // (NFR05). Anything unknown falls back to the default.
        const sortBy = SORTS[sortKey] ?? SORTS.likes;

        const result = await query(
            `SELECT b.build_id, b.user_id, u.username, u.avatar, u.avatar_data, u.titles,
                    b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes, b.views, b.is_public, b.created_at
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             -- banned accounts drop out of the public list; their
             -- builds aren't deleted, so un-banning restores them
             WHERE b.is_public = TRUE
               AND (u.banned_at IS NULL
                    OR (u.banned_until IS NOT NULL AND u.banned_until <= NOW()))
             ORDER BY ${sortBy}
             LIMIT 50`
        );
        res.json(await markLiked(result.rows, req.user?.userId));
    } catch (err) {
        console.error('GET /api/builds failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the builds.' });
    }
}

buildsRouter.get('/', optionalAuth, browse);
buildsRouter.get('/top', optionalAuth, browse);   // old URL kept for compatibility

// ---- SUBMIT A BUILD (login required, FR05) ----
buildsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const opponentTeam = req.body.opponentTeam;
        const counterTeam = req.body.counterTeam;
        const gearSetup = req.body.gearSetup ?? {};
        const note = String(req.body.note ?? '').trim();

        // validate both teams are arrays of cookie names
        const okTeam = (t: unknown, min: number) =>
            Array.isArray(t) && t.length >= min && t.length <= 5 &&
            t.every(c => typeof c === 'string' && c.trim() !== '');

        // The enemy team is OPTIONAL: leaving it empty means "this
        // team works against anything", which is a perfectly normal
        // thing to want to share. The counter team is still required.
        if (!okTeam(opponentTeam, 0)) {
            res.status(400).json({ error: 'The enemy team can have up to 5 cookies.' });
            return;
        }
        if (!okTeam(counterTeam, 1)) {
            res.status(400).json({ error: 'Pick 1-5 cookies for your team.' });
            return;
        }
        if (note.length > 1000) {   // FR05: note max 1000 chars
            res.status(400).json({ error: 'Your note is too long (max 1000 characters).' });
            return;
        }

        const result = await query(
            `INSERT INTO user_builds (user_id, opponent_team, counter_team, gear_setup, note)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING build_id, user_id, opponent_team, counter_team, gear_setup, note, likes, is_public, created_at`,
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

// ---- CHANGE A BUILD'S PRIVACY (owner only) ----
// PATCH /api/builds/:id  { isPublic: true|false }
buildsRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const buildId = Number(req.params.id);
        if (!Number.isInteger(buildId)) {
            res.status(400).json({ error: 'Invalid build.' });
            return;
        }
        const isPublic = Boolean(req.body.isPublic);

        // "AND user_id = $2" is the security check: it only updates the
        // row if it belongs to the person asking, so nobody can change
        // someone else's build.
        const result = await query(
            `UPDATE user_builds SET is_public = $1
             WHERE build_id = $2 AND user_id = $3
             RETURNING build_id, is_public`,
            [isPublic, buildId, req.user!.userId]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: "That build wasn't found, or isn't yours." });
            return;
        }
        res.json(result.rows[0]);

    } catch (err) {
        console.error('PATCH /api/builds/:id failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// ---- DELETE A BUILD (owner only) ----
buildsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const buildId = Number(req.params.id);
        if (!Number.isInteger(buildId)) {
            res.status(400).json({ error: 'Invalid build.' });
            return;
        }

        // Staff can remove ANY build - that's the moderation power.
        // Everyone else can only remove their own, which is what the
        // "AND user_id = $2" below enforces.
        // A moderator (or above) can remove ANY build; everyone
        // else is restricted to their own by the "AND user_id" below.
        const isStaff = isMod(await currentTitles(req.user!.userId));

        // The likes for this build are removed automatically by the
        // ON DELETE CASCADE rule on build_likes.
        const result = isStaff
            ? await query(
                'DELETE FROM user_builds WHERE build_id = $1 RETURNING build_id',
                [buildId])
            : await query(
                'DELETE FROM user_builds WHERE build_id = $1 AND user_id = $2 RETURNING build_id',
                [buildId, req.user!.userId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: "That build wasn't found, or isn't yours." });
            return;
        }
        res.json({ deleted: result.rows[0].build_id });

    } catch (err) {
        console.error('DELETE /api/builds/:id failed:', err);
        res.status(500).json({ error: 'Something went wrong deleting that build.' });
    }
});


// ---- COUNT A VIEW ----
// The browser POSTs here when the detail popup opens for a
// build. There's no rate-limit at the server side - the frontend
// stores which build has been counted today in localStorage, so
// a refresh doesn't run the number up. Nothing user-facing
// depends on the count being exact, so that's fine for now.
buildsRouter.post('/:id/view', async (req: Request, res: Response) => {
    try {
        const buildId = Number(req.params.id);
        if (!Number.isInteger(buildId)) {
            res.status(400).json({ error: 'Invalid build.' });
            return;
        }
        const result = await query(
            `UPDATE user_builds SET views = views + 1
             WHERE build_id = $1 AND is_public = TRUE
             RETURNING views`,
            [buildId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'That build could not be found.' });
            return;
        }
        res.json({ views: result.rows[0].views });
    } catch (err) {
        console.error('POST /api/builds/:id/view failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});
