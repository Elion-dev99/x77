# LiveNova — Next-Generation Live Streaming Platform

A modern live streaming platform built to exceed [X77Live](https://x77.jp/) with ultra-low latency WebRTC streaming, real-time chat, animated gifts, multi-language support, and streamer analytics.

![LiveNova Platform](https://img.shields.io/badge/LiveNova-Streaming-pink)

## Features Beyond X77Live

| Feature | X77Live | LiveNova |
|---------|---------|----------|
| Streaming Technology | Legacy Flash/HLS | **WebRTC (ultra-low latency)** |
| UI/UX | Dated desktop-first | **Modern dark theme, mobile-first** |
| Languages | 4 languages | **4 languages (JP/EN/ZH/KO) with i18n** |
| Chat | Text only | **Text + emoji reactions + gift animations** |
| Gifts | Static action gifts | **Animated gift system with 8 tiers** |
| Analytics | Basic | **Full streamer dashboard with gift breakdown** |
| Picture-in-Picture | No | **Yes** |
| Age Verification | Yes | **Yes (improved UX)** |
| Two-Shot | Yes | **Yes (API ready)** |
| Points System | 1pt = 1 yen | **Demo points with charge API** |
| Moderation | Basic | **Report system + chat moderation ready** |
| Private Rooms | Yes | **Password-protected streams** |
| Multi-Angle | Yes | **Category support** |

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite, i18next
- **Backend**: Node.js, Express, WebSocket, SQLite (better-sqlite3)
- **Streaming**: WebRTC with STUN signaling via WebSocket
- **Real-time**: WebSocket for chat, gifts, viewer counts, WebRTC signaling

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001/ws

## Demo Accounts

| Role | Username | Password | Points |
|------|----------|----------|--------|
| Viewer | `demo_viewer` | `demo1234` | 10,000 |
| Streamer | `sakura_live` | `demo1234` | 50,000 |

Other streamers: `neon_beats`, `kaito_stream`, `luna_nh` (all password: `demo1234`)

## Usage Guide

### As a Viewer
1. Pass age verification gate
2. Browse live streams on the home page
3. Click a stream to watch via WebRTC
4. Login to chat, send gifts, and react with emojis
5. Use Picture-in-Picture for multitasking

### As a Streamer
1. Login with a streamer account
2. Go to **Studio** → Create stream → Start broadcasting
3. Allow camera/microphone permissions
4. View real-time chat and viewer count
5. Check **Analytics** for stream performance and gift breakdown

## Project Structure

```
livenova/
├── apps/
│   ├── web/          # React frontend (Vite)
│   │   └── src/
│   │       ├── components/   # UI components
│   │       ├── context/      # Auth & age gate
│   │       ├── hooks/        # WebSocket & WebRTC
│   │       ├── pages/        # Route pages
│   │       └── lib/          # API client
│   └── server/       # Express backend
│       └── src/
│           ├── db.ts         # SQLite schema
│           ├── routes.ts     # REST API
│           ├── websocket.ts  # Real-time handler
│           └── seed.ts       # Demo data
└── package.json      # Monorepo root
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/streams` | List streams |
| GET | `/api/streams/:id` | Stream details |
| POST | `/api/streams` | Create stream |
| POST | `/api/streams/:id/go-live` | Start streaming |
| POST | `/api/streams/:id/gift` | Send gift |
| GET | `/api/gifts` | List gifts |
| GET | `/api/analytics` | Streamer analytics |
| GET | `/api/stats` | Platform stats |

## Cloudflare Deployment (Production)

Deploy LiveNova to Cloudflare Workers with D1 database and Durable Objects for WebSocket streaming.

### Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. API Token with **Workers Scripts Edit** and **D1 Edit** permissions
3. Account ID from Cloudflare dashboard

### One-command deploy

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
./scripts/deploy-cloudflare.sh
```

Or via npm:

```bash
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy npm run deploy:cf
```

### Manual deploy

```bash
npm run build -w apps/web
cd apps/worker
npx wrangler d1 create livenova-db          # first time only
npx wrangler d1 migrations apply livenova-db --remote
npx wrangler deploy
```

Your app will be available at `https://livenova.<subdomain>.workers.dev`

### GitHub Actions

Add these secrets to your repository:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Push to `main` to auto-deploy via `.github/workflows/deploy-cloudflare.yml`.

### Local Cloudflare dev

```bash
npm run build -w apps/web
cd apps/worker
npx wrangler d1 migrations apply livenova-db --local
npx wrangler dev
```

Open http://localhost:8787

---

## License

MIT
