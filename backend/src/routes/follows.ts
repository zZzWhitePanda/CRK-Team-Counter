// ============================================================
// routes/follows.ts - following other players.
//
// POST /api/follows/:username        follow / unfollow (a toggle)
// GET  /api/follows/:username/followers   who follows them
// GET  /api/follows/:username/following   who they follow
//
// Following works exactly like liking a build: one row per
// relationship, with a UNIQUE rule in the database so the same
// person can't be followed twice, plus a CHECK that stops anyone
// following themselves.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth';

export const followsRouter = Router();

// Find a user by name (names are matched case-insensitively, the
// same way the profile page looks them up).
async function findUser(username: string) {
    const result = await query(
        'SELECT user_id, username FROM users WHERE LOWER(username) = LOWER($1)',
        [username]
    );
    return result.rows[0] as { user_id: number; username: string } | undefined;
}

// ---- FOLLOW / UNFOLLOW (login required) ----
followsRouter.post('/:username', requireAuth, async (req: Request, res: Response) => {
    try {
        const target = await findUser(String(req.params.username));
        if (!target) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }

        const me = req.user!.userId;
        if (target.user_id === me) {
            // the database would reject this too (no_self_follow),
            // but a clear message is nicer than a constraint error
            res.status(400).json({ error: "You can't follow yourself." });
            return;
        }

        // already following? then this click unfollows.
        const existing = await query(
            'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
            [me, target.user_id]
        );

        let following: boolean;
        if (existing.rows.length > 0) {
            await query(
                'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
                [me, target.user_id]);
            following = false;
        } else {
            await query(
                'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
                [me, target.user_id]);
            following = true;
        }

        // send back the new follower count so the page can update
        // without asking again
        const count = await query(
            'SELECT COUNT(*) AS n FROM follows WHERE following_id = $1', [target.user_id]);

        res.json({
            username: target.username,
            following,
            followers: Number(count.rows[0].n),
        });

    } catch (err) {
        console.error('POST /api/follows/:username failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// ---- WHO FOLLOWS THEM / WHO THEY FOLLOW (public) ----
// Both lists are the same shape, so one handler builds either.
function listRoute(kind: 'followers' | 'following') {
    return async (req: Request, res: Response) => {
        try {
            const target = await findUser(String(req.params.username));
            if (!target) {
                res.status(404).json({ error: 'That player could not be found.' });
                return;
            }

            // followers -> people whose follow points AT them
            // following -> people they point at
            //
            // These two column names are the only part of the query
            // built by joining strings, and they come from this fixed
            // list - NOT from anything the user typed - so there is
            // no way to inject SQL here (NFR05). The username still
            // goes in as a $1 placeholder like everywhere else.
            const [matchColumn, pickColumn] = kind === 'followers'
                ? ['following_id', 'follower_id']
                : ['follower_id', 'following_id'];

            const result = await query(
                `SELECT u.username, u.avatar, u.avatar_data, u.title
                 FROM follows f
                 JOIN users u ON u.user_id = f.${pickColumn}
                 WHERE f.${matchColumn} = $1
                 ORDER BY f.followed_at DESC
                 LIMIT 200`,
                [target.user_id]
            );

            res.json({ username: target.username, users: result.rows });

        } catch (err) {
            console.error(`GET /api/follows/:username/${kind} failed:`, err);
            res.status(500).json({ error: 'Something went wrong.' });
        }
    };
}

followsRouter.get('/:username/followers', listRoute('followers'));
followsRouter.get('/:username/following', listRoute('following'));
