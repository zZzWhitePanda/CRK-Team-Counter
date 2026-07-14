# CRK Team Builder — Database

PostgreSQL 17. Run order:

| File | What it does |
|---|---|
| `schema.sql` | Creates the 5 tables + indexes (wipes and rebuilds, safe to re-run) |
| `cookies_seed.sql` | GENERATED — the full 190-cookie roster (don't edit by hand) |
| `seed.sql` | Test users, 3 meta teams, 3 community builds, likes |
| `test_queries.sql` | 9 checks that the lookup logic and database rules work |

## Where the roster comes from

`cookie_data.json` holds every cookie (name, type, position, rarity,
image URL) scraped from the [CRK wiki List of Cookies page](https://cookierunkingdom.fandom.com/wiki/List_of_Cookies)
on 14 Jul 2026. Two scripts use it:

- `node generate_cookie_seed.js` → writes `cookies_seed.sql`
- `node download_images.js` → saves 200px portraits into
  `../assets/cookie-images/` (190 files, ~10MB; already-downloaded
  files are skipped so it's safe to re-run)

When the game adds new cookies: add them to `cookie_data.json`,
re-run both scripts, re-run `cookies_seed.sql`. No code changes.

Cookie names and artwork belong to Devsisters — used here for a
non-commercial school project with the wiki as the source.

## Setup on Mac (done 14 Jul 2026)

```bash
brew install postgresql@17
brew services start postgresql@17          # starts now + on every login
# psql is on the PATH via ~/.zshrc (new terminals only)
createdb crk_team_builder
cd crk-counter-app/database
psql -d crk_team_builder -f schema.sql
psql -d crk_team_builder -f cookies_seed.sql
psql -d crk_team_builder -f seed.sql
psql -d crk_team_builder -f test_queries.sql
```

## Setup on Windows (if I switch machines)

1. Download the PostgreSQL 17 installer from postgresql.org/download/windows and run it (it installs as a service that starts automatically). Remember the password it asks you to set for the `postgres` user.
2. Open "SQL Shell (psql)" from the Start menu, press Enter through the defaults, type the password.
3. `CREATE DATABASE crk_team_builder;` then `\c crk_team_builder`
4. `\i 'C:/path/to/crk-counter-app/database/schema.sql'` then the same for `seed.sql`.

The .sql files themselves are identical on both systems — only the install steps differ.

## Handy commands

```bash
psql -d crk_team_builder        # open an interactive prompt
\dt                             # list tables
\d user_builds                  # show one table's columns
\q                              # quit
```

## The tables (short version)

- **users** — logins; `is_admin` flag separates me from normal users
- **cookies** — the roster; fills the drop-downs and the Cookies page filters
- **meta_teams** — my curated counters; `counters TEXT[]` + `win_rate`
- **user_builds** — community submissions; `opponent_team TEXT[]` + `likes`
- **build_likes** — one row per like; `UNIQUE (user_id, build_id)` stops double-liking

The order-independent counter lookup works because teams are stored as
arrays and searched with `@>` ("contains"), which ignores element order.
GIN indexes on the array columns keep that fast (NFR02/NFR08).

Expected errors in tests 8 and 9 are the database rules correctly
rejecting bad data — that's a pass, not a failure.
