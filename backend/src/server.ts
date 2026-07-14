// ============================================================
// server.ts - the entry point of the backend.
//
// Wires everything together: middleware, the API routes, the
// cookie images, and finally starts listening. Run with:
//     npm run dev     (auto-restarts when a file changes)
// ============================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { cookiesRouter } from './routes/cookies';
import { lookupRouter } from './routes/lookup';
import { topTeamsRouter } from './routes/topTeams';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ---- Middleware (runs before every route) ----
app.use(cors());          // lets the React dev site (different port) call this API
app.use(express.json());  // turns JSON request bodies into req.body

// ---- Routes ----
app.use('/api/cookies', cookiesRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/top-teams', topTeamsRouter);

// the 190 cookie portraits, served as normal static files:
// GET /images/cookies/gingerbrave.png
app.use('/images/cookies',
    express.static(path.join(__dirname, '..', '..', 'assets', 'cookie-images')));

// quick way to check the server is alive (and that the DB name
// loaded from .env) - handy when deploying to Railway later
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`CRK Team Builder API running at http://localhost:${PORT}`);
});
