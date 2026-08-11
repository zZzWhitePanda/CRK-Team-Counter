// ============================================================
// routes/users.ts - profiles and the staff actions.
//
// GET   /api/users/:id            profile + that player's builds
// GET   /api/users                every account (staff)
// GET   /api/users/lookup?q=...   find an account by id or name
// POST  /api/users/:id/titles     add a title (admin/owner)
// DELETE /api/users/:id/titles/:name   remove a title
// POST  /api/users/:id/ban        ban / unban (admin/owner)
// POST  /api/ip-bans              ban an IP (owner)
//
// Profiles are addressed by user id, not username: /u/7 doesn't
// break when someone renames themselves. See permissions.ts for
// the exact rules on who can do what.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth, requireAuth, requireMod, requireAdmin, requireOwner, currentTitles } from '../auth';
import { canAwardTitle, hasTitle, isOwner, readTitles, Title } from '../permissions';

export const usersRouter = Router();


// ---- LOOKUP an account by id or username ----
// Used by the admin panel's "Manage account" form so it can take
// either. Registered before /:id so the paths don't clash.
usersRouter.get('/lookup', requireMod, async (req: Request, res: Response) => {
    try {
        const q = String(req.query.q ?? '').trim();
        if (!q) {
            res.status(400).json({ error: 'Enter an id or username.' });
            return;
        }
        // a bare number is treated as an id, otherwise a name
        const asId = /^\d+$/.test(q) ? Number(q) : null;
        const result = await query(
            asId !== null
                ? `SELECT user_id, username, titles, avatar, avatar_data,
                          banned_at, banned_until, ban_reason, last_ip
                   FROM users WHERE user_id = $1`
                : `SELECT user_id, username, titles, avatar, avatar_data,
                          banned_at, banned_until, ban_reason, last_ip
                   FROM users WHERE LOWER(username) = LOWER($1)`,
            [asId ?? q]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No account with that id or username.' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GET /api/users/lookup failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// ---- EVERY ACCOUNT (staff, for the admin panel) ----
usersRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT u.user_id, u.username, u.avatar, u.avatar_data, u.titles,
                    u.banned_at, u.banned_until, u.ban_reason, u.last_ip, u.created_at,
                    (SELECT COUNT(*) FROM user_builds b WHERE b.user_id = u.user_id) AS build_count
             FROM users u
             ORDER BY u.user_id`);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/users failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the accounts.' });
    }
});


// ---- MY LIKED BUILDS ----
// (Registered before /:id so the paths don't clash.)
usersRouter.get('/me/likes', requireAuth, async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT b.build_id, b.user_id, u.username, u.avatar, u.avatar_data, u.titles,
                    b.opponent_team, b.counter_team, b.gear_setup, b.note,
                    b.likes, b.views, b.is_public, b.created_at,
                    TRUE AS "likedByMe"
             FROM build_likes l
             JOIN user_builds b ON b.build_id = l.build_id
             JOIN users u ON u.user_id = b.user_id
             WHERE l.user_id = $1
               AND (b.is_public = TRUE OR b.user_id = $1)
             ORDER BY l.liked_at DESC`,
            [req.user!.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/users/me/likes failed:', err);
        res.status(500).json({ error: 'Something went wrong loading your liked builds.' });
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
            `SELECT user_id, username, avatar, avatar_data, titles,
                    banned_at, banned_until, created_at
             FROM users WHERE user_id = $1`,
            [userId]
        );
        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        const profile = userResult.rows[0];
        const profileTitles = readTitles(profile.titles);
        const stillBanned = profile.banned_at
            && (profile.banned_until === null || new Date(profile.banned_until) > new Date());

        // Am I looking at my own profile? If so I also see my private
        // builds; otherwise only the public ones.
        const isMe = req.user?.userId === profile.user_id;

        const buildsResult = await query(
            `SELECT b.build_id, b.user_id, u.username, u.avatar, u.avatar_data, u.titles,
                    b.opponent_team, b.counter_team, b.gear_setup, b.note,
                    b.likes, b.views, b.is_public, b.created_at
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

        const totalLikes = builds
            .filter(b => b.is_public)
            .reduce((sum, b) => sum + b.likes, 0);

        const followStats = await query(
            `SELECT
                (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers,
                (SELECT COUNT(*) FROM follows WHERE follower_id  = $1) AS following,
                EXISTS (SELECT 1 FROM follows
                        WHERE follower_id = $2 AND following_id = $1) AS followed_by_me`,
            [profile.user_id, req.user?.userId ?? 0]
        );
        const stats = followStats.rows[0];

        // What the person LOOKING is allowed to do here.
        const viewerTitles = req.user ? await currentTitles(req.user.userId) : [];
        const viewerRole = isOwner(viewerTitles) ? 'owner'
            : hasTitle(viewerTitles, 'Admin') ? 'admin'
            : hasTitle(viewerTitles, 'Mod')   ? 'mod'
            : 'user';

        res.json({
            profile: {
                userId: profile.user_id,
                username: profile.username,
                avatar: profile.avatar,
                avatarData: profile.avatar_data,
                titles: profileTitles,
                role: isOwner(profileTitles) ? 'owner'
                    : hasTitle(profileTitles, 'Admin') ? 'admin'
                    : hasTitle(profileTitles, 'Mod')   ? 'mod'
                    : 'user',
                isBanned: stillBanned,
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
// POST /api/users/:id/titles   { name, color? }
//
// Awards a title. Admin can only hand out Mod / OG / Content
// Creator; owner can hand out anything, including custom titles
// with any colour. See permissions.ts for the exact rules.
// ============================================================
usersRouter.post('/:id/titles', requireAdmin, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId)) {
            res.status(400).json({ error: 'Invalid account.' });
            return;
        }

        const name = String(req.body.name ?? '').trim();
        if (name.length < 1 || name.length > 20) {
            res.status(400).json({ error: 'A title must be between 1 and 20 characters.' });
            return;
        }

        // hex colour check: '#aabbcc' or '#abc'
        const color = String(req.body.color ?? '#8B7CF6').trim();
        if (!/^#[0-9a-fA-F]{3,6}$/.test(color)) {
            res.status(400).json({ error: 'Colour must be a hex code like #ff9900.' });
            return;
        }

        const actorTitles = await currentTitles(req.user!.userId);
        if (!canAwardTitle(actorTitles, name)) {
            res.status(403).json({
                error: `You aren't allowed to award the "${name}" title.`,
            });
            return;
        }

        // Load the target's existing titles, drop any existing
        // one with the same name (case-insensitive), and add the
        // new one. Same name twice would look silly on their card.
        const target = await query('SELECT titles FROM users WHERE user_id = $1', [userId]);
        if (target.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        const existing = readTitles(target.rows[0].titles)
            .filter(t => t.name.toLowerCase() !== name.toLowerCase());
        const next: Title[] = [...existing, { name, color }];

        await query('UPDATE users SET titles = $1::jsonb WHERE user_id = $2',
            [JSON.stringify(next), userId]);

        res.json({ userId, titles: next });

    } catch (err) {
        console.error('POST /api/users/:id/titles failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});


// ============================================================
// DELETE /api/users/:id/titles/:name    remove a title
//
// Removing "Owner" or "Admin" needs the same power as adding it -
// owner-only. Removing the last Owner in the system is refused,
// so the site can never end up with no owner.
// ============================================================
usersRouter.delete('/:id/titles/:name', requireAdmin, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const name = String(req.params.name);

        const actorTitles = await currentTitles(req.user!.userId);
        if (!canAwardTitle(actorTitles, name)) {
            // taking away a title needs the same authority as
            // giving it out - otherwise a mid-rank admin could
            // strip an owner
            res.status(403).json({
                error: `You aren't allowed to remove the "${name}" title.`,
            });
            return;
        }

        // Removing the LAST Owner would leave the site with no
        // owner, so refuse. This also stops one bad decision by
        // the only owner from bricking the site.
        if (name.toLowerCase() === 'owner') {
            const owners = await query(
                `SELECT COUNT(*) AS n FROM users
                 WHERE titles @> '[{"name": "Owner"}]'`);
            if (Number(owners.rows[0].n) <= 1) {
                res.status(400).json({ error: "The site must always have at least one owner." });
                return;
            }
        }

        const target = await query('SELECT titles FROM users WHERE user_id = $1', [userId]);
        if (target.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        const next = readTitles(target.rows[0].titles)
            .filter(t => t.name.toLowerCase() !== name.toLowerCase());

        await query('UPDATE users SET titles = $1::jsonb WHERE user_id = $2',
            [JSON.stringify(next), userId]);

        res.json({ userId, titles: next });

    } catch (err) {
        console.error('DELETE /api/users/:id/titles/:name failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});


// ============================================================
// POST /api/users/:id/ban
//   { banned, reason?, minutes?, ipBan? }
//
// minutes = how long the ban lasts. null / missing = permanent.
// ipBan   = also add the account's last known IP to the IP ban
//           list, blocking anyone signing in from there.
//
// Admin and up. An admin can't ban an owner or another admin,
// which stops moderators from turning on each other.
// ============================================================
usersRouter.post('/:id/ban', requireAdmin, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const banned = req.body.banned === true;
        const reason = String(req.body.reason ?? '').trim().slice(0, 200) || null;
        const rawMinutes = Number(req.body.minutes);
        const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : null;
        const ipBan = req.body.ipBan === true;

        const target = await query(
            'SELECT titles, last_ip FROM users WHERE user_id = $1', [userId]);
        if (target.rows.length === 0) {
            res.status(404).json({ error: 'That player could not be found.' });
            return;
        }
        const targetTitles = readTitles(target.rows[0].titles);

        // Level-of-authority checks. Only an owner can touch an
        // owner or an admin. This stops one admin banning another
        // and, more importantly, protects the site owner.
        const actorTitles = await currentTitles(req.user!.userId);
        if (isOwner(targetTitles) && !isOwner(actorTitles)) {
            res.status(403).json({ error: "Only the site owner can ban another owner." });
            return;
        }
        if (hasTitle(targetTitles, 'Admin') && !isOwner(actorTitles)) {
            res.status(403).json({ error: "Only the site owner can ban an admin." });
            return;
        }

        // ---- do the ban ----
        const bannedAt   = banned ? new Date() : null;
        const bannedUntil = banned && minutes
            ? new Date(Date.now() + minutes * 60_000)
            : null;

        const result = await query(
            `UPDATE users
             SET banned_at = $1, banned_until = $2, ban_reason = $3
             WHERE user_id = $4
             RETURNING user_id, username, banned_at, banned_until, ban_reason, last_ip`,
            [bannedAt, bannedUntil, banned ? reason : null, userId]);

        // If they wanted an IP ban and we know the target's last
        // IP, add it to the block list too. IP bans only make
        // sense while banning, not while un-banning.
        if (banned && ipBan) {
            const ip = target.rows[0].last_ip;
            if (!ip) {
                // no login = no known IP. Don't fail the ban, just
                // tell the caller.
                res.json({ ...result.rows[0], ipBan: false, ipMessage: "No last-known IP to block for that account." });
                return;
            }
            await query(
                `INSERT INTO banned_ips (ip, banned_until, reason)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (ip) DO UPDATE
                    SET banned_until = EXCLUDED.banned_until,
                        reason       = EXCLUDED.reason`,
                [ip, bannedUntil, reason]);
        }

        res.json({ ...result.rows[0], ipBan: banned && ipBan });

    } catch (err) {
        console.error('POST /api/users/:id/ban failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});


