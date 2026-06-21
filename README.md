# CF Recommender

A personalized Codeforces problem recommendation engine that analyzes your submission history and generates a daily practice queue tailored to your weak tags and comfort zone rating.

**Live Demo:** [cf-recommender.vercel.app](https://cf-recommender.vercel.app)  
**Backend API:** [cf-recommender-yk3u.onrender.com](https://cf-recommender-yk3u.onrender.com/health)

---

## Features

- **Personalized Daily Queue** — 5 problems per day: 3 targeting your weakest tags (weighted random), 1 stretch problem above your comfort zone, 1 forgotten tag not practiced in 14+ days
- **Tag Analytics** — Per-tag success rate, solve count, and difficulty heatmap computed from your full submission history
- **Comfort Zone Detection** — Automatically finds your rating ceiling (highest bucket with >70% solve rate) and sets recommendation floor accordingly
- **AI Weakness Report** — Gemini API analyzes your tag stats and writes a specific, data-grounded 3-4 sentence weakness analysis
- **AI Practice Plan Generator** — Input a goal ("prep for DE Shaw in 3 weeks") and get a structured week-by-week plan based on your actual weak tags
- **Problem Hints** — One-sentence nudge per problem without revealing the solution (rate-limited to 3/day)
- **Solve Streak Tracker** — GitHub-style contribution heatmap of daily solves for the last 12 weeks
- **Friend Comparison** — Add friends by CF handle, compare per-tag success rates side by side
- **Shareable Profile** — Public profile page at `/profile/:handle` showing your stats, weak tags, and strong tags
- **Contest Rating History** — Chart.js time-series of your CF rating across all rated contests
- **Manual Sync** — Re-fetch submissions on demand via Sync CF button

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React + Vite | UI framework |
| React Router v6 | Client-side routing with protected route guards |
| Chart.js + react-chartjs-2 | Tag heatmap, rating distribution, rating history charts |
| Axios | HTTP client with request/response interceptors for auto token refresh |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| PostgreSQL (Neon) | Primary database — 7 tables |
| Redis (Upstash) | Caching, rate limiting, session data |
| JWT | Stateless auth — access token (15min) + refresh token (7 days) |
| bcryptjs | Password hashing (salt rounds: 12) |
| node-cron | Midnight queue generation + weekly problem sync |
| Gemini API | AI weakness reports and practice plans |
| Axios | Codeforces API integration |

### Infrastructure
| Service | Role |
|---------|------|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| Neon | Serverless PostgreSQL |
| Upstash | Serverless Redis |

---

## Architecture

```
client/                          # React + Vite frontend
├── src/
│   ├── api/                     # Axios API call functions
│   │   ├── auth.js              # register, login, getMe
│   │   ├── analytics.js         # overview, tag stats, comfort zone, streak
│   │   ├── queue.js             # daily queue, regenerate, mark solved
│   │   ├── ai.js                # weakness report, practice plan, hints
│   │   ├── friends.js           # add, remove, compare friends
│   │   └── user.js              # link handle, sync, profile
│   ├── components/              # Reusable UI components
│   │   ├── DailyQueue.jsx       # 5 problem cards with hint + mark solved
│   │   ├── ProblemCard.jsx      # Individual problem card
│   │   ├── StreakWidget.jsx      # GitHub-style contribution heatmap
│   │   ├── TagHeatmap.jsx       # Horizontal bar chart of weak tags
│   │   ├── ComfortZoneChart.jsx # Rating distribution chart
│   │   ├── RatingHistory.jsx    # Contest rating time-series
│   │   ├── WeaknessReport.jsx   # AI analysis card
│   │   └── PracticePlan.jsx     # AI practice plan generator
│   ├── hooks/
│   │   └── useAuth.jsx          # Auth context + provider
│   └── pages/
│       ├── Login.jsx            # Login + register
│       ├── Setup.jsx            # CF handle linking
│       ├── Dashboard.jsx        # Main dashboard
│       ├── Friends.jsx          # Friend comparison
│       └── PublicProfile.jsx    # Shareable public profile

server/                          # Node.js + Express backend
├── src/
│   ├── controllers/             # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── analyticsController.js
│   │   ├── queueController.js
│   │   └── aiController.js
│   ├── services/                # External integrations
│   │   ├── cfService.js         # Codeforces API
│   │   ├── ingestionService.js  # Bulk insert + tag stat computation
│   │   ├── problemService.js    # Problem list sync + recommendation queries
│   │   ├── recommendationService.js # Queue generation algorithm
│   │   └── aiService.js         # Gemini API + caching
│   ├── routes/                  # Express route definitions
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT verification
│   ├── jobs/
│   │   └── dailyQueue.js        # Cron jobs
│   └── db/
│       ├── index.js             # PostgreSQL pool
│       ├── redis.js             # Redis client
│       └── migrations/
│           └── 001_initial_schema.sql
```

---

## Database Schema

```sql
users          — id, email, password_hash, cf_handle, comfort_zone_rating,
                 current_streak, longest_streak, last_synced_at, email_digest

submissions    — user_id, cf_submission_id, problem_id, problem_name,
                 rating, tags[], verdict, submitted_at
                 UNIQUE(user_id, cf_submission_id)

tag_stats      — user_id, tag, attempted, solved, success_rate,
                 avg_difficulty, last_solved_at
                 UNIQUE(user_id, tag)

problems       — cf_problem_id, contest_id, problem_index, name, rating, tags[]
                 GIN index on tags for fast array search

daily_queues   — user_id, queue_date, problems (JSONB)
                 UNIQUE(user_id, queue_date)

solve_log      — user_id, solved_date, problems_solved
                 UNIQUE(user_id, solved_date)

friendships    — user_id, friend_id
                 CHECK(user_id != friend_id)
```

---

## Recommendation Algorithm

```
1. Fetch user's comfort_zone_rating from DB
2. Query tag_stats WHERE attempted >= 2, ordered by success_rate ASC
3. Weighted random tag selection:
     weight = 1 - success_rate
     dp at 30% success → weight 0.70 (appears more often)
     greedy at 85% success → weight 0.15 (appears less often)
4. For each selected tag, query problems table:
     WHERE rating BETWEEN comfort_zone+100 AND comfort_zone+200
     AND tag = ANY(tags)
     AND problem_id NOT IN (user's attempted problems)
5. Fill 5 slots:
     Slots 1-3: weak tag problems (weighted random)
     Slot 4:    stretch problem (comfort_zone+200 to comfort_zone+350)
     Slot 5:    forgotten tag (last_solved_at < 14 days ago)
6. Fallback: fill remaining slots with rated problems if tag data is sparse
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL database (Neon free tier recommended)
- Redis (Upstash free tier recommended)
- Gemini API key (free at aistudio.google.com)

### Clone and install

```bash
git clone https://github.com/kartikey-singh-k/cf-recommender.git
cd cf-recommender

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment variables

Create `server/.env`:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://user:pass@host/cf_recommender?sslmode=require
REDIS_URL=redis://default:pass@host:6379

JWT_SECRET=your_64_char_random_string
JWT_REFRESH_SECRET=your_other_64_char_random_string

GEMINI_API_KEY=your_gemini_api_key
CF_API_BASE=https://codeforces.com/api
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### Run migrations

```bash
cd server
npm run migrate
```

### Start development servers

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---


## API Endpoints

```
POST   /api/auth/register          Register new account
POST   /api/auth/login             Login
POST   /api/auth/refresh           Refresh access token
GET    /api/auth/me                Get current user

POST   /api/user/handle            Link CF handle + trigger ingestion
POST   /api/user/sync              Manual submission sync
GET    /api/user/profile           Get user profile + stats
GET    /api/user/public/:handle    Public profile (no auth)
GET    /api/user/rating-history    CF contest rating history

GET    /api/analytics/overview     Total solved, success rate, hardest
GET    /api/analytics/tags         Per-tag stats sorted by success rate
GET    /api/analytics/comfort-zone Rating distribution + comfort zone
GET    /api/analytics/streak       Current streak + 6-month solve log

GET    /api/queue/today            Get or generate today's queue
POST   /api/queue/regenerate       Force regenerate (rate limited 1/hr)
POST   /api/queue/solved           Mark problem as solved

GET    /api/ai/weakness-report     AI analysis of weak tags (cached 24hr)
POST   /api/ai/practice-plan       Generate week-by-week plan from goal

GET    /api/friends                Get friends list with weak tags
POST   /api/friends                Add friend by CF handle
DELETE /api/friends/:friendId      Remove friend
GET    /api/friends/compare/:id    Side-by-side tag comparison
```

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Root: `client/`, Build: `npm run build`, Output: `dist` |
| Backend | Render | Root: `server/`, Start: `node src/index.js`, Port: `10000` |
| Database | Neon | Serverless PostgreSQL, free tier |
| Cache | Upstash | Serverless Redis, free tier |

---

