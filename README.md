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

## Credits

Cookie names and artwork belong to Devsisters, sourced from the
[Cookie Run: Kingdom Wiki](https://cookierunkingdom.fandom.com).
Non-commercial school project.
