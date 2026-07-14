// ============================================================
// routes/lookup.ts - the Counter Tool endpoint (FR03/FR04/FR09).
//
// POST /api/lookup
// body: { "enemyTeam": ["Shadow Milk Cookie", ...],
//         "enemyGear": { "Shadow Milk Cookie": "Swift Chocolate" } }
//
// Checks the input, then hands the real work to CounterService.
// ============================================================

import { Router, Request, Response } from 'express';
import { counterService, GearSetup } from '../services/CounterService';

export const lookupRouter = Router();

lookupRouter.post('/', async (req: Request, res: Response) => {
    try {
        const enemyTeam = req.body.enemyTeam as unknown;
        const enemyGear = (req.body.enemyGear ?? {}) as GearSetup;

        // FR09: an empty search is rejected with a clear message.
        // The frontend checks this too, but the server can never
        // trust the browser - someone can call the API directly.
        if (!Array.isArray(enemyTeam) || enemyTeam.length === 0) {
            res.status(400).json({ error: 'Please pick at least one enemy cookie.' });
            return;
        }
        if (enemyTeam.length > 5) {
            res.status(400).json({ error: 'An enemy team can have at most 5 cookies.' });
            return;
        }
        // every entry must be a plain string (cookie name)
        if (!enemyTeam.every(c => typeof c === 'string' && c.trim() !== '')) {
            res.status(400).json({ error: 'Enemy team contained an invalid cookie.' });
            return;
        }

        const result = await counterService.lookupCounters(enemyTeam, enemyGear);
        res.json(result);

    } catch (err) {
        console.error('POST /api/lookup failed:', err);
        res.status(500).json({ error: 'Something went wrong running the search.' });
    }
});
