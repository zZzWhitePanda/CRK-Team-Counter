# CRK Team Builder

A website that helps Cookie Run: Kingdom players find counter teams for
Arena. Type in the enemy team (and optionally their gear) and get back:

- **meta teams** from a curated database, ranked by win rate
- **community teams** submitted by other players, ranked by likes

Built for my VCE Software Development SAT (Units 3 & 4).

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL 17 |
| Hosting | Vercel (frontend) + Railway/Render (backend + DB) |

## Project structure

```
crk-counter-app/
├── database/        SQL schema, seed data, tests + roster generator
├── assets/          cookie portraits (190, from the CRK wiki)
├── design-system/   MASTER.md - colors, fonts, layout rules
├── backend/         Express API          (in progress)
└── frontend/        React site           (in progress)
```

## Getting started

See [database/README.md](database/README.md) for PostgreSQL setup
(Mac and Windows) and how to build + seed the database.

Run locally: `npm run dev` in `backend/` (port 4000), then
`npm run dev` in `frontend/` (port 5173, proxies to the backend).

## Deployment ($0 hosting)

| Piece | Host | Notes |
|---|---|---|
| Frontend | Vercel | live at crk-team-builder.vercel.app |
| Backend | Render (free web service) | configured by `render.yaml`; sleeps when idle, first request takes ~30-60s to wake |
| Database | Neon (free PostgreSQL) | Render's own free DB deletes itself after 30 days, Neon's doesn't |

Steps (in order):
1. **Neon:** create a project, copy the connection string, then load
   the schema + data into it from this repo:
   `psql "<neon connection string>" -f database/schema.sql` and the
   same for `cookies_seed.sql` then `seed.sql`.
2. **Render:** New → Blueprint → connect this GitHub repo. It reads
   `render.yaml`. Paste the Neon connection string as `DATABASE_URL`.
3. **Vercel:** set `VITE_API_URL` to the Render service URL
   (e.g. `https://crk-team-builder-api.onrender.com`) and redeploy.

The Render free tier going to sleep conflicts with the speed goal
(NFR02) — documented trade-off of the $0 budget constraint. The
database staying on Neon keeps data safe from Render's 30-day limit.

## Credits

Cookie names and artwork belong to Devsisters, sourced from the
[Cookie Run: Kingdom Wiki](https://cookierunkingdom.fandom.com).
Non-commercial school project.
