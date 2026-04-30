# CRK Counter-Pick Backend

Express.js API server with PostgreSQL database.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your database URL
npm start
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/crk_counter
PORT=3001
NODE_ENV=development
```

## Database Setup

1. Install PostgreSQL
2. Create database: `CREATE DATABASE crk_counter;`
3. Run schema: `psql -d crk_counter -f schema.sql`

## API Routes

- `POST /api/lookup` - Get counter recommendations
- `POST /api/submit-build` - Submit community build
- `POST /api/vote` - Vote on a build
- `GET /api/top-builds` - Get top community builds
- `GET /api/meta-teams` - Get meta team data
- `GET /api/health` - Health check

## Deploy to Railway

1. Create Railway account
2. New project > Deploy from GitHub
3. Add PostgreSQL database
4. Set `DATABASE_URL` environment variable (auto-set)
5. Deploy

## Deploy to Render

1. Create Render account
2. New Web Service > Connect GitHub
3. Add PostgreSQL database (separate service)
4. Link database to web service
5. Deploy
