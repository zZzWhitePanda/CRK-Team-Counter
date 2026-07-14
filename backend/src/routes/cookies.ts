// ============================================================
// routes/cookies.ts - the cookie roster endpoint (FR01).
//
// GET /api/cookies             -> all 190 cookies (fills drop-downs)
// GET /api/cookies?search=milk -> name contains "milk"
// GET /api/cookies?type=Magic&rarity=Beast -> filtered (Cookies page)
//
// The filters match the pills on the Cookies page mockup.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';

export const cookiesRouter = Router();

cookiesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { search, type, rarity } = req.query;

        // The WHERE clause is built up piece by piece depending on
        // which filters the user actually used. Values always go in
        // through $1/$2/... placeholders, never glued into the SQL
        // string, so a search like '; DROP TABLE cookies; just gets
        // treated as a (weird) cookie name (NFR05).
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (typeof search === 'string' && search.trim() !== '') {
            params.push('%' + search.trim() + '%');
            conditions.push(`name ILIKE $${params.length}`); // ILIKE = ignore upper/lower case
        }
        if (typeof type === 'string' && type !== '') {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }
        if (typeof rarity === 'string' && rarity !== '') {
            params.push(rarity);
            conditions.push(`rarity = $${params.length}`);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const result = await query(
            `SELECT cookie_id, name, type, position, rarity, image_file
             FROM cookies
             ${where}
             ORDER BY name`,
            params
        );

        res.json(result.rows);

    } catch (err) {
        // UC07: log the real error for me, show the user a simple one
        console.error('GET /api/cookies failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the cookies.' });
    }
});
