// ============================================================
// auth.ts - everything to do with logins in one place.
//
// Passwords are never stored as plain text. When someone signs
// up, bcrypt turns their password into a scrambled "hash" that
// can't be reversed. At login we hash what they typed and check
// it matches the stored hash.
//
// A JWT (JSON Web Token) is a signed ticket the server gives the
// browser after login. The browser sends it back on later
// requests to prove who it is, so the user stays logged in
// without sending their password every time.
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { query } from './db';
import { Title, readTitles, isMod, isAdmin, isOwner } from './permissions';

// the secret used to sign tokens. In production it's set as an
// environment variable; the fallback is only for local dev.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_LIFETIME = '7d';   // stay logged in for a week

// ---- passwords ----
export async function hashPassword(plain: string): Promise<string> {
    // 10 = "cost", how much work bcrypt does (higher = slower/safer)
    return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

// ---- tokens ----
// what we store inside the token: just the user id + admin flag
export interface TokenPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
}

export function makeToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}

function readToken(req: Request): TokenPayload | null {
    // the browser sends the token as:  Authorization: Bearer <token>
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    } catch {
        return null; // expired or tampered-with token
    }
}

// Add the logged-in user onto the request object so routes can
// read req.user. (TypeScript needs to be told this field exists.)
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

// ---- middleware ----

// optionalAuth: attach the user IF a valid token is sent, but
// don't block the request if not. Used on public pages that show
// extra info when logged in (e.g. which teams you've liked).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    const payload = readToken(req);
    if (payload) req.user = payload;
    next();
}

// requireAuth: block the request unless a valid token is sent.
// Used on actions that need an account (submit a build, like).
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const payload = readToken(req);
    if (!payload) {
        res.status(401).json({ error: 'Please log in to do that.' });
        return;
    }
    req.user = payload;
    next();
}

// ---- power checks ----
// Permissions are driven by TITLES, not a role column. Whoever
// carries the Owner title is an owner; Admin makes them an admin,
// Mod makes them a moderator. See permissions.ts.
//
// Both checks re-read titles FROM THE DATABASE rather than
// trusting the login token. A token is issued at login and never
// changes afterwards, so one made before somebody was promoted
// would still say "no titles" - and, worse, one made before they
// were DEMOTED would still say they were staff. The database is
// the truth.

/** Fetch someone's titles from the database. */
export async function currentTitles(userId: number): Promise<Title[]> {
    const result = await query('SELECT titles FROM users WHERE user_id = $1', [userId]);
    return readTitles(result.rows[0]?.titles);
}

function requirePower(
    check: (titles: Title[]) => boolean,
    refusal: string,
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const payload = readToken(req);
        if (!payload) {
            res.status(401).json({ error: 'Please log in to do that.' });
            return;
        }
        try {
            const titles = await currentTitles(payload.userId);
            if (!check(titles)) {
                // The same message however it failed, so this
                // doesn't tell a stranger who the staff are.
                res.status(403).json({ error: refusal });
                return;
            }
            req.user = payload;
            next();
        } catch (err) {
            console.error('power check failed:', err);
            res.status(500).json({ error: 'Something went wrong.' });
        }
    };
}

// A moderator (or above) can delete any community build.
export const requireMod   = requirePower(isMod,   'Only a moderator can do that.');
// An admin (or the owner) can ban and award most titles.
export const requireAdmin = requirePower(isAdmin, 'Only a moderator can do that.');
// Only the owner can create custom titles, hand out Owner/Admin,
// and use the owner-only bits of the admin panel.
export const requireOwner = requirePower(isOwner, 'Only the site owner can do that.');
