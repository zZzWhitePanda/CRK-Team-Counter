// /api/ip-bans - block whole IP addresses. owner only

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireOwner } from '../auth';

export const ipBansRouter = Router();

// rough IP check, enough to catch a typo
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

        // re-banning updates the row instead of adding another
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
