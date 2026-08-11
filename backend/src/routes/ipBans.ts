// ============================================================
// routes/ipBans.ts - blocking whole IP addresses.
//
// A per-account ban stops that one person coming back. IP bans
// are the stronger version: anyone signing in from a banned IP
// is refused, whichever account they use. Owner-only.
//
// GET    /api/ip-bans            list active bans
// POST   /api/ip-bans            { ip, reason?, minutes? }
// DELETE /api/ip-bans/:ip        un-ban an IP
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireOwner } from '../auth';

export const ipBansRouter = Router();

// simple IPv4 / IPv6 shape check - not a full parse (Postgres
// wouldn't care), but enough that a typo gets caught here
const IP_RE = /^[0-9a-fA-F.:]+$/;

ipBansRouter.get('/', requireOwner, async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT ip, reason, banned_at, banned_until FROM banned_ips
             WHERE banned_until IS NULL OR banned_until > NOW()
             ORDER BY banned_at DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/ip-bans failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

ipBansRouter.post('/', requireOwner, async (req: Request, res: Response) => {
    try {
        const ip = String(req.body.ip ?? '').trim();
        if (!IP_RE.test(ip) || ip.length > 64) {
            res.status(400).json({ error: "That doesn't look like an IP address." });
            return;
        }

        const reason = String(req.body.reason ?? '').trim().slice(0, 200) || null;
        const rawMinutes = Number(req.body.minutes);
        const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : null;
        const bannedUntil = minutes ? new Date(Date.now() + minutes * 60_000) : null;

        // re-banning the same ip UPDATES the row rather than
        // making a second one (that's what the UNIQUE rule is for)
        const result = await query(
            `INSERT INTO banned_ips (ip, banned_until, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (ip) DO UPDATE
                SET banned_until = EXCLUDED.banned_until,
                    reason       = EXCLUDED.reason
             RETURNING ip, reason, banned_at, banned_until`,
            [ip, bannedUntil, reason]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/ip-bans failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

ipBansRouter.delete('/:ip', requireOwner, async (req: Request, res: Response) => {
    try {
        const ip = String(req.params.ip);
        const result = await query(
            'DELETE FROM banned_ips WHERE ip = $1 RETURNING ip', [ip]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "That IP isn't banned." });
            return;
        }
        res.json({ deleted: result.rows[0].ip });
    } catch (err) {
        console.error('DELETE /api/ip-bans/:ip failed:', err);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});
