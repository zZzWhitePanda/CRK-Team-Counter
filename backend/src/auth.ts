// logins: hashed passwords and signed tokens

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { query } from './db';
import { Title, readTitles, isMod, isAdmin, isOwner } from './permissions';

// the secret tokens are signed with
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_LIFETIME = '7d';   // how long a login lasts

// passwords
export async function hashPassword(plain: string): Promise<string> {
    // 10 = how much work bcrypt does
    return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

// tokens
// what's stored inside a token
export interface TokenPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
}

export function makeToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}

function readToken(req: Request): TokenPayload | null {
    // sent as: Authorization: Bearer <token>
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    } catch {
        return null; // expired or tampered with
    }
}

// lets routes read req.user
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

// middleware

// attach the user if logged in, but don't require it
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    const payload = readToken(req);
    if (payload) req.user = payload;
    next();
}

// block the request unless logged in
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const payload = readToken(req);
    if (!payload) {
        res.status(401).json({ error: 'Please log in to do that.' });
        return;
    }
    req.user = payload;
    next();
}

// power checks. titles are read from the database, not the token,
// because a token never changes after login

// get someone's titles
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
                // same message either way, so staff aren't revealed
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

// mods can delete builds
export const requireMod   = requirePower(isMod,   'Only a moderator can do that.');
// admins can ban and award most titles
export const requireAdmin = requirePower(isAdmin, 'Only a moderator can do that.');
// only the owner gets the rest
export const requireOwner = requirePower(isOwner, 'Only the site owner can do that.');
