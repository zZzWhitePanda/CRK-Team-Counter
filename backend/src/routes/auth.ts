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

export const authRouter = Router();

// small helper: the safe public view of a user (never the hash!)
interface UserRow {
    user_id: number; username: string; email: string; is_admin: boolean;
    avatar?: string | null; avatar_data?: string | null;
    title?: string | null; username_changed_at?: Date | string | null;
}
function publicUser(row: UserRow) {
    return {
        userId: row.user_id, username: row.username, email: row.email,
        isAdmin: row.is_admin,
        avatar: row.avatar ?? null,
        avatarData: row.avatar_data ?? null,
        title: row.title ?? null,
        // when they may next change their username (null = right now)
        usernameChangeableAt: nextRenameAllowed(row.username_changed_at ?? null),
    };
}

// The columns every route below reads back, kept in one place so
// they can't drift apart.
const USER_COLUMNS =
    'user_id, username, email, is_admin, avatar, avatar_data, title, username_changed_at';

// ---- the username change cooldown ----
// A profile lives at /u/<username>, so renaming breaks every link
// anyone has to it. One change every 3 days keeps addresses stable.
export const RENAME_COOLDOWN_DAYS = 3;

/**
 * Given when the name was last changed, work out when it may next
 * be changed. Returns null when that's now (or they've never
 * changed it), otherwise an ISO date string.
 */
function nextRenameAllowed(lastChanged: Date | string | null): string | null {
    if (!lastChanged) return null;                 // never renamed
    const next = new Date(lastChanged);
    next.setDate(next.getDate() + RENAME_COOLDOWN_DAYS);
    return next.getTime() > Date.now() ? next.toISOString() : null;
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
            `SELECT ${USER_COLUMNS}, password_hash
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

            // Look up their current name and when they last changed
            // it, so we can apply the cooldown.
            const current = await query(
                'SELECT username, username_changed_at FROM users WHERE user_id = $1',
                [req.user!.userId]
            );
            if (current.rows.length === 0) {
                res.status(404).json({ error: 'Account not found.' });
                return;
            }

            // Only an actual CHANGE counts - re-saving the same name
            // (e.g. when only the picture changed) shouldn't start
            // a 3-day cooldown.
            if (username !== current.rows[0].username) {
                const blockedUntil = nextRenameAllowed(current.rows[0].username_changed_at);
                if (blockedUntil) {
                    const when = new Date(blockedUntil).toLocaleDateString('en-AU',
                        { day: 'numeric', month: 'long', year: 'numeric' });
                    res.status(429).json({
                        error: `You can only change your username once every ${RENAME_COOLDOWN_DAYS} days. `
                             + `You can change it again on ${when}.`,
                    });
                    return;
                }
                params.push(username);
                sets.push(`username = $${params.length}`);
                // start the clock for the next change
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
