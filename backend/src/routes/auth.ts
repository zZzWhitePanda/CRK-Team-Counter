// ============================================================
// routes/auth.ts - sign up, log in, and "who am I".
//
// POST /api/auth/signup  {username, email, password}
// POST /api/auth/login   {email, password}
// GET  /api/auth/me      (Bearer token) -> the logged-in user
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { hashPassword, checkPassword, makeToken, requireAuth } from '../auth';
import { readTitles, isMod, isAdmin, isOwner } from '../permissions';

export const authRouter = Router();

// small helper: the safe public view of a user (never the hash!)
interface UserRow {
    user_id: number; username: string; email: string; is_admin: boolean;
    avatar?: string | null; avatar_data?: string | null;
    titles?: unknown; theme?: unknown;
    username_changed_at?: Date | string | null;
}
function publicUser(row: UserRow) {
    const titles = readTitles(row.titles);
    return {
        userId: row.user_id, username: row.username, email: row.email,
        isAdmin: isAdmin(titles),
        // the effective role, worked out from the person's titles
        // (see permissions.ts). Kept as a plain string so the
        // frontend doesn't have to reason about titles for the
        // simple "can I see the admin nav item" case.
        role: isOwner(titles) ? 'owner'
            : isAdmin(titles) ? 'admin'
            : isMod(titles)   ? 'mod'
            : 'user',
        avatar: row.avatar ?? null,
        avatarData: row.avatar_data ?? null,
        titles,
        theme: row.theme ?? null,
        usernameChangeableAt: nextRenameAllowed(row.username_changed_at ?? null),
    };
}

// The columns every route below reads back, kept in one place so
// they can't drift apart.
const USER_COLUMNS =
    'user_id, username, email, is_admin, avatar, avatar_data, titles, theme, username_changed_at';

// ---- username-change cooldown ----
// Renaming is limited to once every 3 days: it plays with the
// name-hold pool so someone can't churn through names and burn
// through the pool's 14-day slots.
export const RENAME_COOLDOWN_DAYS = 3;
export const NAME_HOLD_DAYS = 14;

/** When the current user may next change their username, or null. */
function nextRenameAllowed(lastChanged: Date | string | null): string | null {
    if (!lastChanged) return null;
    const next = new Date(lastChanged);
    next.setDate(next.getDate() + RENAME_COOLDOWN_DAYS);
    return next.getTime() > Date.now() ? next.toISOString() : null;
}

/**
 * Is this name available for `userId` to take (either the
 * username field on some other row, or someone else's hold)?
 * Case-insensitive to match the UNIQUE rule. Empty error message
 * = it's free.
 */
/** Human-readable "you're banned because…" message. */
function banMessage(reason: string | null, until: Date | string | null, ip = false): string {
    const who = ip ? 'This IP address' : 'This account';
    const parts = [`${who} has been banned.`];
    if (reason) parts.push(`Reason: ${reason}.`);
    if (until) {
        const when = new Date(until).toLocaleString('en-AU',
            { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        parts.push(`Access returns after ${when}.`);
    }
    return parts.join(' ');
}

async function nameConflict(username: string, userId: number | null): Promise<string> {
    const lower = username.toLowerCase();

    const taken = await query(
        'SELECT user_id FROM users WHERE LOWER(username) = $1',
        [lower]);
    if (taken.rows.length > 0 && taken.rows[0].user_id !== userId) {
        return 'That username is already taken.';
    }

    // an unexpired hold blocks anyone but the person the hold is for
    const held = await query(
        `SELECT held_for_user_id FROM username_holds
         WHERE username_lower = $1 AND expires_at > NOW()`,
        [lower]);
    if (held.rows.length > 0 && held.rows[0].held_for_user_id !== userId) {
        return "That username is being held by someone else for now — it'll be released soon.";
    }
    return '';
}

// ---- checking an uploaded profile picture ----
// The browser shrinks the picture to 128x128 and re-compresses it
// before sending, so anything arriving here should be tiny. This
// still checks it properly, because the browser is the USER'S side
// of the app and a determined person can send whatever they like
// straight to the API (NFR05).
const MAX_AVATAR_BYTES = 200 * 1024;   // 200 KB - ~10x a normal upload

function checkAvatarData(value: unknown): { ok: true } | { ok: false; error: string } {
    if (value === null) return { ok: true };          // null = remove the picture
    if (typeof value !== 'string') {
        return { ok: false, error: 'That picture could not be read.' };
    }
    // must be an image data URI, not a link to somewhere else and not
    // some other kind of file dressed up as one
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
        return { ok: false, error: 'Please choose a PNG, JPEG or WebP image.' };
    }
    // base64 is 4 characters per 3 bytes, so this is the real size
    const bytes = Math.floor(value.split(',')[1].length * 3 / 4);
    if (bytes > MAX_AVATAR_BYTES) {
        return { ok: false, error: 'That picture is too big — please pick a smaller one.' };
    }
    return { ok: true };
}

// ---- SIGN UP ----
authRouter.post('/signup', async (req: Request, res: Response) => {
    try {
        const username = String(req.body.username ?? '').trim();
        const email = String(req.body.email ?? '').trim().toLowerCase();
        const password = String(req.body.password ?? '');

        // basic validation (checked again by the database rules)
        if (username.length < 3) {
            res.status(400).json({ error: 'Username must be at least 3 characters.' });
            return;
        }
        if (!email.includes('@')) {
            res.status(400).json({ error: 'Please enter a valid email.' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters.' });
            return;
        }

        // The database's UNIQUE rule blocks two users with the
        // same name, but the hold pool is a separate table so it
        // has to be checked in code too. Doing it BEFORE the
        // hashing (which is deliberately slow) saves the effort
        // when the name is already gone.
        const clash = await nameConflict(username, null);
        if (clash) {
            res.status(409).json({ error: clash });
            return;
        }

        // hash the password BEFORE it ever touches the database
        const passwordHash = await hashPassword(password);

        const result = await query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING ${USER_COLUMNS}`,
            [username, email, passwordHash]
        );

        const user = result.rows[0];
        const token = makeToken({ userId: user.user_id, username: user.username, isAdmin: user.is_admin });
        res.status(201).json({ token, user: publicUser(user) });

    } catch (err: unknown) {
        // Postgres error 23505 = a UNIQUE rule was broken, i.e. the
        // username or email is already taken.
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
            res.status(409).json({ error: 'That username or email is already taken.' });
            return;
        }
        console.error('POST /api/auth/signup failed:', err);
        res.status(500).json({ error: 'Something went wrong creating your account.' });
    }
});

// ---- LOG IN ----
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const email = String(req.body.email ?? '').trim().toLowerCase();
        const password = String(req.body.password ?? '');

        const result = await query(
            `SELECT ${USER_COLUMNS}, password_hash, banned_at, banned_until, ban_reason
             FROM users WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];
        // Check the user exists AND the password matches. We give
        // the same vague message for both so an attacker can't tell
        // which emails are registered.
        if (!user || !(await checkPassword(password, user.password_hash))) {
            res.status(401).json({ error: 'Wrong email or password.' });
            return;
        }

        // A banned account keeps all its data but can't get back in.
        // This is checked AFTER the password, so it can't be used to
        // find out which emails are banned without knowing the password.
        //
        // banned_until is when the ban lifts (NULL = permanent). Once
        // that time passes the account works normally again, without
        // an admin having to do anything.
        if (user.banned_at && (user.banned_until === null || new Date(user.banned_until) > new Date())) {
            res.status(403).json({
                error: banMessage(user.ban_reason, user.banned_until),
            });
            return;
        }

        // Refuse anyone signing in from a banned IP, whichever
        // account they're using. This is what makes an IP ban
        // actually stop a person coming back on a new account.
        const ip = req.ip ?? '';
        if (ip) {
            const ipBan = await query(
                `SELECT reason, banned_until FROM banned_ips
                 WHERE ip = $1 AND (banned_until IS NULL OR banned_until > NOW())`,
                [ip]);
            if (ipBan.rows.length > 0) {
                res.status(403).json({
                    error: banMessage(ipBan.rows[0].reason, ipBan.rows[0].banned_until, true),
                });
                return;
            }
            // remember the last IP they signed in from, so an owner
            // can see which IP to add to the ban list later
            await query('UPDATE users SET last_ip = $1 WHERE user_id = $2',
                [ip, user.user_id]);
        }

        const token = makeToken({ userId: user.user_id, username: user.username, isAdmin: user.is_admin });
        res.json({ token, user: publicUser(user) });

    } catch (err) {
        console.error('POST /api/auth/login failed:', err);
        res.status(500).json({ error: 'Something went wrong logging in.' });
    }
});

// ---- WHO AM I (used when the site reloads with a saved token) ----
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT ${USER_COLUMNS} FROM users WHERE user_id = $1`,
            [req.user!.userId]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Account not found.' });
            return;
        }
        res.json({ user: publicUser(result.rows[0]) });
    } catch (err) {
        console.error('GET /api/auth/me failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// ---- UPDATE MY PROFILE (username and/or profile picture) ----
// PATCH /api/auth/me  { username?, avatar?, avatarData? }
//
// avatar     = a cookie portrait filename picked from the roster
// avatarData = a picture the user uploaded, as a data URI
// Setting one clears the other, because you only have one picture.
authRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        // Build the update from only the fields that were sent, so
        // changing just the avatar doesn't wipe the username.
        const sets: string[] = [];
        const params: unknown[] = [];

        // The rename branch is complicated by two rules:
        //   * you can only change your name once every 3 days
        //   * releasing your old name puts it in a hold pool for
        //     14 days, so nobody else can grab it while you decide
        //     whether to keep the new one
        let renameFrom: string | null = null;
        if (req.body.username !== undefined) {
            const username = String(req.body.username).trim();
            if (username.length < 3) {
                res.status(400).json({ error: 'Username must be at least 3 characters.' });
                return;
            }
            if (username.length > 30) {
                res.status(400).json({ error: 'Username must be 30 characters or fewer.' });
                return;
            }

            const current = await query(
                'SELECT username, username_changed_at FROM users WHERE user_id = $1',
                [req.user!.userId]);
            const currentName = current.rows[0]?.username;

            // re-saving the SAME name doesn't do anything (and
            // shouldn't start the 3-day cooldown)
            if (username !== currentName) {
                const blockedUntil = nextRenameAllowed(current.rows[0]?.username_changed_at);
                if (blockedUntil) {
                    const when = new Date(blockedUntil).toLocaleDateString('en-AU',
                        { day: 'numeric', month: 'long', year: 'numeric' });
                    res.status(429).json({
                        error: `You can change your username once every ${RENAME_COOLDOWN_DAYS} days. `
                             + `Next change available on ${when}.`,
                    });
                    return;
                }

                // is it taken - by someone else, or in someone
                // else's hold slot?
                const clash = await nameConflict(username, req.user!.userId);
                if (clash) {
                    res.status(409).json({ error: clash });
                    return;
                }

                renameFrom = currentName ?? null;
                params.push(username);
                sets.push(`username = $${params.length}`);
                sets.push('username_changed_at = NOW()');
            }
        }

        if (req.body.avatar !== undefined) {
            // a cookie portrait filename, or null to clear it
            const avatar = req.body.avatar === null ? null : String(req.body.avatar).trim();
            params.push(avatar);
            sets.push(`avatar = $${params.length}`);
            // picking a cookie replaces any uploaded picture
            sets.push('avatar_data = NULL');
        }

        if (req.body.avatarData !== undefined) {
            const check = checkAvatarData(req.body.avatarData);
            if (!check.ok) {
                res.status(400).json({ error: check.error });
                return;
            }
            params.push(req.body.avatarData);
            sets.push(`avatar_data = $${params.length}`);
            // uploading a picture replaces any chosen cookie portrait
            sets.push('avatar = NULL');
        }

        if (sets.length === 0) {
            // Nothing actually changed. That's not an error when they
            // re-saved the name they already have, so just hand back
            // the account as it stands.
            if (req.body.username !== undefined) {
                const unchanged = await query(
                    `SELECT ${USER_COLUMNS} FROM users WHERE user_id = $1`, [req.user!.userId]);
                const me = unchanged.rows[0];
                res.json({
                    token: makeToken({ userId: me.user_id, username: me.username, isAdmin: me.is_admin }),
                    user: publicUser(me),
                });
                return;
            }
            res.status(400).json({ error: 'Nothing to update.' });
            return;
        }

        params.push(req.user!.userId);
        const result = await query(
            `UPDATE users SET ${sets.join(', ')}
             WHERE user_id = $${params.length}
             RETURNING ${USER_COLUMNS}`,
            params
        );

        const user = result.rows[0];

        // The username they just RELEASED goes into the hold pool
        // for 14 days: nobody else can take it in that window, but
        // they can change back to it. ON CONFLICT means picking up
        // a name they held before just resets its expiry clock.
        if (renameFrom) {
            await query(
                `INSERT INTO username_holds (username_lower, held_for_user_id, expires_at)
                 VALUES ($1, $2, NOW() + ($3 || ' days')::INTERVAL)
                 ON CONFLICT (username_lower) DO UPDATE
                    SET held_for_user_id = EXCLUDED.held_for_user_id,
                        expires_at       = EXCLUDED.expires_at`,
                [renameFrom.toLowerCase(), req.user!.userId, NAME_HOLD_DAYS]);

            // Their NEW name shouldn't be blocked by any old hold
            // (their own or nobody's - nameConflict already refused
            // one held for someone else). Clearing it stops a
            // stale hold from confusing later checks.
            await query(
                'DELETE FROM username_holds WHERE username_lower = $1',
                [user.username.toLowerCase()]);
        }

        // the username is inside the login token, so hand back a fresh
        // token whenever it changes
        const token = makeToken({ userId: user.user_id, username: user.username, isAdmin: user.is_admin });
        res.json({ token, user: publicUser(user) });

    } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
            res.status(409).json({ error: 'That username is already taken.' });
            return;
        }
        console.error('PATCH /api/auth/me failed:', err);
        res.status(500).json({ error: 'Something went wrong saving your profile.' });
    }
});


// ============================================================
// THEMES
//
// PUT    /api/auth/me/theme    save the theme I'm using now
// GET    /api/auth/me/themes   my saved theme presets
// POST   /api/auth/me/themes   save the current theme as a preset
// DELETE /api/auth/me/themes/:id   delete one of my presets
//
// A theme is stored as JSONB: it's a small bundle of settings that
// is always read and written whole, so the database never needs to
// look inside it.
// ============================================================

// A theme can carry a background picture, so it's much bigger than
// an avatar. The browser shrinks the picture before sending, but
// this is checked again here because the browser can't be trusted.
const MAX_THEME_BYTES = 1_500_000;   // ~1.5 MB of JSON

function checkTheme(value: unknown): { ok: true } | { ok: false; error: string } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { ok: false, error: 'That theme could not be read.' };
    }
    const theme = value as Record<string, unknown>;

    // the background picture must be an image, not a link to
    // somewhere else and not some other kind of file
    const image = theme.backgroundImage;
    if (image !== null && image !== undefined) {
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
            return { ok: false, error: 'The background must be an image.' };
        }
    }
    if (JSON.stringify(theme).length > MAX_THEME_BYTES) {
        return { ok: false, error: 'That background image is too big — please use a smaller one.' };
    }
    return { ok: true };
}

// ---- save the theme I'm currently using ----
authRouter.put('/me/theme', requireAuth, async (req: Request, res: Response) => {
    try {
        const check = checkTheme(req.body.theme);
        if (!check.ok) {
            res.status(400).json({ error: check.error });
            return;
        }
        await query('UPDATE users SET theme = $1 WHERE user_id = $2',
            [JSON.stringify(req.body.theme), req.user!.userId]);
        res.json({ saved: true });
    } catch (err) {
        console.error('PUT /api/auth/me/theme failed:', err);
        res.status(500).json({ error: 'Something went wrong saving your theme.' });
    }
});

// ---- my saved presets ----
authRouter.get('/me/themes', requireAuth, async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT theme_id, name, theme FROM user_themes
             WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user!.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/auth/me/themes failed:', err);
        res.status(500).json({ error: 'Something went wrong loading your themes.' });
    }
});

// ---- save the current theme as a named preset ----
authRouter.post('/me/themes', requireAuth, async (req: Request, res: Response) => {
    try {
        const name = String(req.body.name ?? '').trim();
        if (name.length < 1 || name.length > 40) {
            res.status(400).json({ error: 'Give your theme a name (up to 40 characters).' });
            return;
        }
        const check = checkTheme(req.body.theme);
        if (!check.ok) {
            res.status(400).json({ error: check.error });
            return;
        }

        // Saving under a name you've already used REPLACES it, which
        // is what people expect from a "save" button. The UNIQUE rule
        // on (user_id, name) is what makes ON CONFLICT work here.
        const result = await query(
            `INSERT INTO user_themes (user_id, name, theme)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, name) DO UPDATE SET theme = EXCLUDED.theme
             RETURNING theme_id, name, theme`,
            [req.user!.userId, name, JSON.stringify(req.body.theme)]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/auth/me/themes failed:', err);
        res.status(500).json({ error: 'Something went wrong saving that theme.' });
    }
});

// ---- delete one of my presets ----
authRouter.delete('/me/themes/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const themeId = Number(req.params.id);
        if (!Number.isInteger(themeId)) {
            res.status(400).json({ error: 'Invalid theme.' });
            return;
        }
        // "AND user_id" is the security check - you can only delete
        // your own presets, never somebody else's
        const result = await query(
            'DELETE FROM user_themes WHERE theme_id = $1 AND user_id = $2 RETURNING theme_id',
            [themeId, req.user!.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "That theme wasn't found, or isn't yours." });
            return;
        }
        res.json({ deleted: result.rows[0].theme_id });
    } catch (err) {
        console.error('DELETE /api/auth/me/themes/:id failed:', err);
        res.status(500).json({ error: 'Something went wrong deleting that theme.' });
    }
});
