// backend entry point

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { cookiesRouter } from './routes/cookies';
import { lookupRouter } from './routes/lookup';
import { authRouter } from './routes/auth';
import { buildsRouter } from './routes/builds';
import { usersRouter } from './routes/users';
import { followsRouter } from './routes/follows';
import { ipBansRouter } from './routes/ipBans';

dotenv.config();

const app = express();

// trust one proxy hop, so we get the real client IP
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 4000;

// middleware
app.use(cors());          // lets the frontend call this API
// read JSON bodies. the limit is high because pictures are sent inside them
app.use(express.json({ limit: '4mb' }));

// routes
app.use('/api/cookies', cookiesRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/auth', authRouter);
app.use('/api/builds', buildsRouter);
app.use('/api/users', usersRouter);
app.use('/api/follows', followsRouter);
app.use('/api/ip-bans', ipBansRouter);

// the game images
const assets = (folder: string) =>
    express.static(path.join(__dirname, '..', '..', 'assets', folder));
app.use('/images/cookies', assets('cookie-images'));
app.use('/images/toppings', assets('topping-images'));
app.use('/images/beascuits', assets('beascuit-images'));
app.use('/images/ascension', assets('ascension-images'));
app.use('/images/treasures', assets('treasure-images'));
app.use('/images/awakening', assets('awakening-images'));
app.use('/images/topping-board', assets('topping-board'));
// the site's own artwork
app.use('/images/brand', assets('brand'));

// check the server is alive
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`CRK Team Builder API running at http://localhost:${PORT}`);
});
