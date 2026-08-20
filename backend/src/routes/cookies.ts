// GET /api/cookies - the roster, with optional filters (FR01)

import { Router, Request, Response } from 'express';
import { query } from '../db';

export const cookiesRouter = Router();

cookiesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { search, type, rarity } = req.query;

        // build the WHERE clause from whichever filters were used.
        // values go in as placeholders, never glued into the SQL (NFR05)
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (typeof search === 'string' && search.trim() !== '') {
            params.push('%' + search.trim() + '%');
            conditions.push(`name ILIKE $${params.length}`); // ILIKE ignores case
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

        // send the date as text so the timezone can't shift it
        const result = await query(
            `SELECT cookie_id, name, type, position, rarity, image_file,
                    TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date,
                    elements, recommended_toppings, skill_name, skill_cooldown,
                    skill_description, quote, description, traits, voice_actor
             FROM cookies
             ${where}
             ORDER BY name`,
            params
        );

        res.json(result.rows);

    } catch (err) {
        // UC07: log the real error, show a simple one
        console.error('GET /api/cookies failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the cookies.' });
    }
});
