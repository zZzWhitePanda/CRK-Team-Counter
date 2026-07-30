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
import { authRouter } from './routes/auth';
import { buildsRouter } from './routes/builds';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ---- Middleware (runs before every route) ----
app.use(cors());          // lets the React dev site (different port) call this API
app.use(express.json());  // turns JSON request bodies into req.body

// ---- Routes ----
app.use('/api/cookies', cookiesRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/auth', authRouter);
app.use('/api/builds', buildsRouter);

// the game art, served as normal static files:
//   GET /images/cookies/gingerbrave.png        (190 cookie portraits)
//   GET /images/toppings/raspberry.png         (toppings + tart-*.png)
//   GET /images/beascuits/magic.png            (8 beascuit types)
//   GET /images/ascension/star-3.png           (ascension stars 1-5)
const assets = (folder: string) =>
    express.static(path.join(__dirname, '..', '..', 'assets', folder));
app.use('/images/cookies', assets('cookie-images'));
app.use('/images/toppings', assets('topping-images'));
app.use('/images/beascuits', assets('beascuit-images'));
app.use('/images/ascension', assets('ascension-images'));

// quick way to check the server is alive (and that the DB name
// loaded from .env) - handy when deploying to Railway later
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`CRK Team Builder API running at http://localhost:${PORT}`);
});
