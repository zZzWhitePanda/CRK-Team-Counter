// ============================================================
// routes/users.ts - public player profiles.
//
// GET /api/users/:username
//   -> that player's profile plus the builds they've posted.
//
// Anyone can look at anyone's profile (that's the point - you click
// a name on Community Builds to see their other teams). Private
// builds are only included when YOU are the owner, which is why
// this route uses optionalAuth: it works logged out, but shows you
// extra when the profile is your own.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth } from '../auth';

export const usersRouter = Router();

usersRouter.get('/:username', optionalAuth, async (req: Request, res: Response) => {
    try {
        const username = String(req.params.username);

        const userResult = await query(
            `SELECT user_id, username, avatar, avatar_data, is_admin, created_at
             FROM users WHERE LOWER(username) = LOWER($1)`,
            [username]
        );
        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        const profile = userResult.rows[0];

        // Am I looking at my own profile? If so I also see my private
        // builds; otherwise only the public ones.
        const isMe = req.user?.userId === profile.user_id;

        const buildsResult = await query(
            `SELECT b.build_id, u.username, u.avatar, u.avatar_data, b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes, b.is_public, b.created_at
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             WHERE b.user_id = $1
               AND ($2 = TRUE OR b.is_public = TRUE)
             ORDER BY b.created_at DESC`,
            [profile.user_id, isMe]
        );

        // which of these builds have I liked? (so hearts show filled)
        let builds = buildsResult.rows;
        if (req.user && builds.length > 0) {
            const liked = await query(
                `SELECT build_id FROM build_likes WHERE user_id = $1 AND build_id = ANY($2)`,
                [req.user.userId, builds.map(b => b.build_id)]
            );
            const likedSet = new Set(liked.rows.map(r => r.build_id));
            builds = builds.map(b => ({ ...b, likedByMe: likedSet.has(b.build_id) }));
        }

        // total likes across all their public builds - a nice stat
        const totalLikes = builds
            .filter(b => b.is_public)
            .reduce((sum, b) => sum + b.likes, 0);

        res.json({
            profile: {
                userId: profile.user_id,
                username: profile.username,
                avatar: profile.avatar,
                avatarData: profile.avatar_data,
                isAdmin: profile.is_admin,
                createdAt: profile.created_at,
                isMe,
                buildCount: builds.filter(b => b.is_public).length,
                totalLikes,
            },
            builds,
        });

    } catch (err) {
        console.error('GET /api/users/:username failed:', err);
        res.status(500).json({ error: 'Something went wrong loading that profile.' });
    }
});
