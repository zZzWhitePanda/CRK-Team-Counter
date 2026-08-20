// /api/follows - following other players

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth';

export const followsRouter = Router();

// find a user by id
async function findUser(id: string) {
    const userId = Number(id);
    if (!Number.isInteger(userId)) return undefined;
    const result = await query(
        'SELECT user_id, username FROM users WHERE user_id = $1', [userId]);
    return result.rows[0] as { user_id: number; username: string } | undefined;
}

// follow / unfollow
followsRouter.post('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const target = await findUser(String(req.params.id));
        if (!target) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }

        const me = req.user!.userId;
        if (target.user_id === me) {
            // the database blocks this too, but this reads better
            res.status(400).json({ error: "You can't follow yourself." });
            return;
        }

        // already following, so unfollow
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

        // send the new count back
        const count = await query(
            'SELECT COUNT(*) AS n FROM follows WHERE following_id = $1', [target.user_id]);

        res.json({
            username: target.username,
            following,
            followers: Number(count.rows[0].n),
        });

    } catch (err) {
        console.error('POST /api/follows/:id failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// followers and following, both the same shape
function listRoute(kind: 'followers' | 'following') {
    return async (req: Request, res: Response) => {
        try {
            const target = await findUser(String(req.params.id));
            if (!target) {
                res.status(404).json({ error: 'That player could not be found.' });
                return;
            }

            // these column names come from a fixed list, not user input (NFR05)
            const [matchColumn, pickColumn] = kind === 'followers'
                ? ['following_id', 'follower_id']
                : ['follower_id', 'following_id'];

            const result = await query(
                `SELECT u.user_id, u.username, u.avatar, u.avatar_data, u.title
                 FROM follows f
                 JOIN users u ON u.user_id = f.${pickColumn}
                 WHERE f.${matchColumn} = $1
                 ORDER BY f.followed_at DESC
                 LIMIT 200`,
                [target.user_id]
            );

            res.json({ username: target.username, users: result.rows });

        } catch (err) {
            console.error(`GET /api/follows/:id/${kind} failed:`, err);
            res.status(500).json({ error: 'Something went wrong.' });
        }
    };
}

followsRouter.get('/:id/followers', listRoute('followers'));
followsRouter.get('/:id/following', listRoute('following'));
