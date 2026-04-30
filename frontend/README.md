# CRK Counter-Pick Frontend

React web application for counter-pick lookups and community build sharing.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env to point to your backend
npm start
```

## Environment Variables

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:3001
```

For production (Vercel):
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## Development

```bash
npm start       # Start development server (http://localhost:3000)
npm run build   # Build for production
```

## Deploy to Vercel

1. Create Vercel account
2. Import GitHub repository
3. Set root directory to `frontend`
4. Add environment variable: `REACT_APP_API_URL=<backend-url>`
5. Deploy

## Features

- Team composition input
- Counter recommendations from meta database
- Community build submissions
- Build voting system
- Responsive design
