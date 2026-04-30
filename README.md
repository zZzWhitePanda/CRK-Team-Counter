# CRK Counter-Pick System

A web application for Cookie Run Kingdom players to find optimal team counters and share community builds.

## Features

- 🔍 **Counter Lookup**: Input opponent team and get recommended counters from meta database
- 👥 **Community Builds**: Users can submit and vote on their own successful matchup strategies
- 📊 **Meta Tracking**: Database of current meta teams with win rates
- 🎯 **Gear Recommendations**: Get optimal gear setups for each matchup

## Tech Stack

**Frontend:**
- React
- Axios for API calls
- CSS for styling

**Backend:**
- Node.js + Express
- PostgreSQL database
- RESTful API

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd crk-counter-app
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your PostgreSQL connection string
# DATABASE_URL=postgresql://username:password@localhost:5432/crk_counter
```

**Create Database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE crk_counter;
\q

# Run schema
psql -U postgres -d crk_counter -f schema.sql
```

**Start Backend:**

```bash
npm start
# Backend runs on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Create .env file
cp .env.example .env

# For local development, .env should have:
# REACT_APP_API_URL=http://localhost:3001
```

**Start Frontend:**

```bash
npm start
# Frontend runs on http://localhost:3000
```

## Deployment

### Deploy Backend (Railway/Render)

1. Create account on [Railway.app](https://railway.app) or [Render.com](https://render.com)
2. Create new project from GitHub repo
3. Add PostgreSQL database service
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway/Render when you add Postgres)
   - `NODE_ENV=production`
5. Deploy from `backend` folder

### Deploy Frontend (Vercel)

1. Create account on [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   - `REACT_APP_API_URL=<your-backend-url>`
5. Deploy

## Project Structure

```
crk-counter-app/
├── backend/
│   ├── server.js          # Express API server
│   ├── schema.sql         # Database schema
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styling
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global styles
│   ├── package.json       # Frontend dependencies
│   └── .env.example       # Environment variables template
└── README.md              # This file
```

## API Endpoints

### `POST /api/lookup`
Get counter recommendations for an opponent team.

**Request:**
```json
{
  "opponent_team": ["Dark Cacao", "Financier", "Captain Caviar"],
  "opponent_gear": {"Dark Cacao": "Swift Chocolate"}
}
```

**Response:**
```json
{
  "meta_counters": [...],
  "community_builds": [...]
}
```

### `POST /api/submit-build`
Submit a new community build.

**Request:**
```json
{
  "user_id": "user_abc123",
  "opponent_team": ["Dark Cacao", "Financier"],
  "counter_team": ["Black Pearl", "Oyster"],
  "gear_setup": {"Black Pearl": "Searing Raspberry"},
  "description": "Burst them down before they sustain"
}
```

### `POST /api/vote`
Vote on a community build.

**Request:**
```json
{
  "build_id": 1,
  "user_id": "user_abc123",
  "vote_type": "like"
}
```

### `GET /api/top-builds?limit=10`
Get top-voted community builds.

### `GET /api/meta-teams`
Get all curated meta teams.

### `GET /api/health`
Health check endpoint.

## Future Enhancements

- 🖼️ **Image Recognition**: Upload screenshots to auto-detect opponent teams
- 🔐 **User Authentication**: Accounts for tracking submissions and votes
- 📈 **Analytics**: Win rate tracking and meta statistics
- 🎮 **Live Arena Integration**: Real-time matchup data
- 🌐 **Multi-language Support**: Localization for global players

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - feel free to use this project however you want.

## Support

For bugs or feature requests, open an issue on GitHub.
# CRK-Team-Matchup
