// ============================================================
// routes/topTeams.ts - the "top teams" list (FR08).
//
// GET /api/top-teams -> the 10 most liked community builds
// across the whole site. Ties broken by newest first (FR08).
// Powers the Community Builds page "Top" tab.
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';

export const topTeamsRouter = Router();

topTeamsRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT b.build_id, u.username, b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes, b.created_at
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             ORDER BY b.likes DESC, b.created_at DESC
             LIMIT 10`
        );
        res.json(result.rows);

    } catch (err) {
        console.error('GET /api/top-teams failed:', err);
        res.status(500).json({ error: 'Something went wrong loading the top teams.' });
    }
});
