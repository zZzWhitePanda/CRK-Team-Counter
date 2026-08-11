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
import { optionalAuth, requireAdmin } from '../auth';

export const usersRouter = Router();

usersRouter.get('/:username', optionalAuth, async (req: Request, res: Response) => {
    try {
        const username = String(req.params.username);

        const userResult = await query(
            `SELECT user_id, username, avatar, avatar_data, title, is_admin, created_at
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
            `SELECT b.build_id, u.username, u.avatar, u.avatar_data, u.title, b.opponent_team, b.counter_team,
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

        // Follower / following counts, and - if I'm logged in -
        // whether I already follow them (so the button reads
        // "Following" instead of "Follow"). One query, three answers.
        const followStats = await query(
            `SELECT
                (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers,
                (SELECT COUNT(*) FROM follows WHERE follower_id  = $1) AS following,
                EXISTS (SELECT 1 FROM follows
                        WHERE follower_id = $2 AND following_id = $1) AS followed_by_me`,
            [profile.user_id, req.user?.userId ?? 0]
        );
        const stats = followStats.rows[0];

        // whether the person LOOKING is an admin, which is what
        // decides if the "set title" control shows. Read from the
        // database, not the token, which may predate the admin flag.
        let viewerIsAdmin = false;
        if (req.user) {
            const viewer = await query(
                'SELECT is_admin FROM users WHERE user_id = $1', [req.user.userId]);
            viewerIsAdmin = viewer.rows[0]?.is_admin === true;
        }

        res.json({
            profile: {
                userId: profile.user_id,
                username: profile.username,
                avatar: profile.avatar,
                avatarData: profile.avatar_data,
                title: profile.title,
                isAdmin: profile.is_admin,
                createdAt: profile.created_at,
                isMe,
                buildCount: builds.filter(b => b.is_public).length,
                totalLikes,
                followers: Number(stats.followers),
                following: Number(stats.following),
                followedByMe: stats.followed_by_me === true,
                viewerIsAdmin,
            },
            builds,
        });

    } catch (err) {
        console.error('GET /api/users/:username failed:', err);
        res.status(500).json({ error: 'Something went wrong loading that profile.' });
    }
});


// ============================================================
// PATCH /api/users/:username/title   { title }
//
// Sets somebody's profile badge ('OG', 'Owner', 'Admin', …).
// ADMIN ONLY - requireAdmin checks the is_admin column in the
// database, so a normal player calling this by hand gets 403 and
// nobody can award themselves a title. Sending null clears it.
// ============================================================
usersRouter.patch('/:username/title', requireAdmin, async (req: Request, res: Response) => {
    try {
        let title: string | null;
        if (req.body.title === null || req.body.title === '') {
            title = null;                       // clearing the title
        } else {
            title = String(req.body.title ?? '').trim();
            if (title.length > 20) {
                res.status(400).json({ error: 'A title must be 20 characters or fewer.' });
                return;
            }
            if (title === '') title = null;
        }

        const result = await query(
            `UPDATE users SET title = $1
             WHERE LOWER(username) = LOWER($2)
             RETURNING username, title`,
            [title, String(req.params.username)]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        res.json(result.rows[0]);

    } catch (err) {
        console.error('PATCH /api/users/:username/title failed:', err);
        res.status(500).json({ error: 'Something went wrong saving that title.' });
    }
});
