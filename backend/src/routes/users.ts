// ============================================================
// routes/users.ts - player profiles and the staff actions.
//
// GET   /api/users/:id            a profile + that player's builds
// GET   /api/users                every account (staff only)
// PATCH /api/users/:id/title      award a title      (OWNER only)
// PATCH /api/users/:id/role       promote/demote     (OWNER only)
// POST  /api/users/:id/ban        ban / unban        (OWNER only)
//
// Profiles are looked up by their NUMBER, not their name. That's
// deliberate: a profile lives at /u/7, so changing your username
// never breaks a link anyone saved - the same reason Roblox uses
// /users/<id> rather than the name.
//
// Anyone can look at anyone's profile - that's the point, you click
// a name on Community Builds to see their other teams. Private
// builds are only included when YOU are the owner, which is why
// this route uses optionalAuth: it works logged out, but shows you
// extra when the profile is your own.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth, requireAdmin, requireOwner } from '../auth';

export const usersRouter = Router();

// ---- EVERY ACCOUNT (staff only, for the admin panel) ----
// Registered before /:id so "/api/users" isn't mistaken for a
// profile whose id is empty.
usersRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT u.user_id, u.username, u.avatar, u.avatar_data, u.title,
                    u.role, u.banned_at, u.ban_reason, u.created_at,
                    (SELECT COUNT(*) FROM user_builds b WHERE b.user_id = u.user_id) AS build_count
             FROM users u
             ORDER BY u.user_id`);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/users failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the accounts.' });
    }
});

// ---- ONE PROFILE ----
usersRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId)) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }

        const userResult = await query(
            `SELECT user_id, username, avatar, avatar_data, title, role,
                    banned_at, created_at
             FROM users WHERE user_id = $1`,
            [userId]
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
            `SELECT b.build_id, b.user_id, u.username, u.avatar, u.avatar_data, u.title,
                    b.opponent_team, b.counter_team,
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

        // What the person LOOKING is allowed to do here. Read from the
        // database, not the token, which may predate a role change.
        let viewerRole = 'user';
        if (req.user) {
            const viewer = await query(
                'SELECT role FROM users WHERE user_id = $1', [req.user.userId]);
            viewerRole = viewer.rows[0]?.role ?? 'user';
        }

        res.json({
            profile: {
                userId: profile.user_id,
                username: profile.username,
                avatar: profile.avatar,
                avatarData: profile.avatar_data,
                title: profile.title,
                role: profile.role,
                isAdmin: profile.role === 'admin' || profile.role === 'owner',
                isBanned: profile.banned_at !== null,
                createdAt: profile.created_at,
                isMe,
                buildCount: builds.filter(b => b.is_public).length,
                totalLikes,
                followers: Number(stats.followers),
                following: Number(stats.following),
                followedByMe: stats.followed_by_me === true,
                viewerRole,
            },
            builds,
        });

    } catch (err) {
        console.error('GET /api/users/:id failed:', err);
        res.status(500).json({ error: 'Something went wrong loading that profile.' });
    }
});


// ============================================================
// PATCH /api/users/:id/title   { title }
//
// Awards somebody's badge ('OG', 'Owner', 'Admin', …).
// OWNER ONLY - admins deliberately cannot do this, so moderators
// can't hand out titles. requireOwner reads the role column from
// the database, so calling this by hand still gets a 403.
// ============================================================
usersRouter.patch('/:id/title', requireOwner, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId)) {
            res.status(400).json({ error: 'Invalid account.' });
            return;
        }

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
            `UPDATE users SET title = $1 WHERE user_id = $2
             RETURNING user_id, username, title`,
            [title, userId]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        res.json(result.rows[0]);

    } catch (err) {
        console.error('PATCH /api/users/:id/title failed:', err);
        res.status(500).json({ error: 'Something went wrong saving that title.' });
    }
});


// ============================================================
// PATCH /api/users/:id/role   { role: 'user' | 'admin' }
//
// Promotes somebody to moderator, or takes it away. OWNER ONLY.
//
// Nobody can be made owner through the API, and an owner can't be
// demoted: there is exactly one owner, whoever holds the first
// account. That stops the site being handed over by accident.
// ============================================================
usersRouter.patch('/:id/role', requireOwner, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const role = String(req.body.role ?? '');

        if (!['user', 'admin'].includes(role)) {
            res.status(400).json({ error: 'A role must be either user or admin.' });
            return;
        }

        const target = await query('SELECT role FROM users WHERE user_id = $1', [userId]);
        if (target.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        if (target.rows[0].role === 'owner') {
            res.status(400).json({ error: "The site owner's role can't be changed." });
            return;
        }

        // is_admin is kept in step with role so any older code that
        // still reads the old flag keeps behaving
        const result = await query(
            `UPDATE users SET role = $1, is_admin = $2 WHERE user_id = $3
             RETURNING user_id, username, role`,
            [role, role === 'admin', userId]
        );
        res.json(result.rows[0]);

    } catch (err) {
        console.error('PATCH /api/users/:id/role failed:', err);
        res.status(500).json({ error: 'Something went wrong changing that role.' });
    }
});


// ============================================================
// POST /api/users/:id/ban   { banned: true|false, reason? }
//
// Bans or un-bans an account. OWNER ONLY.
//
// A ban does NOT delete anything - it stamps a date, and the login
// route refuses anyone carrying one. Their builds stay exactly
// where they are, so un-banning puts everything back.
// ============================================================
usersRouter.post('/:id/ban', requireOwner, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const banned = req.body.banned === true;
        const reason = String(req.body.reason ?? '').trim().slice(0, 200);

        const target = await query('SELECT role FROM users WHERE user_id = $1', [userId]);
        if (target.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        // banning the owner would lock the site's only owner out for good
        if (target.rows[0].role === 'owner') {
            res.status(400).json({ error: "The site owner can't be banned." });
            return;
        }

        const result = await query(
            `UPDATE users
             SET banned_at = $1, ban_reason = $2
             WHERE user_id = $3
             RETURNING user_id, username, banned_at, ban_reason`,
            [banned ? new Date() : null, banned ? (reason || null) : null, userId]
        );
        res.json(result.rows[0]);

    } catch (err) {
        console.error('POST /api/users/:id/ban failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});
