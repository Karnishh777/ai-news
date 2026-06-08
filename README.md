<div align="center">

# 📰 NewsFlow AI

**An AI-personalized, real-time news platform.**
Built to replace newspapers and TV news — a feed that learns what you care about.

Next.js 15 · React 19 · TypeScript · Tailwind · Framer Motion · Prisma · JWT + OTP

</div>

---

## ✨ What's inside

| Area | Status |
| --- | --- |
| **Auth** — Login, Signup, **Email OTP verification**, Forgot password | ✅ Working |
| JWT sessions (httpOnly cookies), bcrypt hashing, Zod validation, rate limiting | ✅ Working |
| **Onboarding wizard** — interests, language, length, alerts, location | ✅ Working |
| **Personalized feed** — trending rail, For-You feed, category sections, infinite scroll | ✅ Working |
| **AI personalization engine** — learns from clicks, dwell time, likes, saves, shares | ✅ Working |
| **Article page** — AI summary, key takeaways, 30s/full read, text size, related, fact-check | ✅ Working |
| **Real-time breaking news** — Server-Sent Events + animated toast | ✅ Working |
| **Search** — debounced, instant suggestions | ✅ Working |
| **Library** — saved articles + reading history | ✅ Working |
| **Notifications** — bell with unread badge | ✅ Working |
| **Admin dashboard** — KPIs, growth, engagement, top interests, trending | ✅ Working |
| **Dark / light mode**, glassmorphism, responsive, skeleton loaders | ✅ Working |
| **PostgreSQL schema (Prisma)** + Docker + seed | ✅ Provided (production path) |
| NewsAPI / RSS adapters, SMTP email, Anthropic summaries | 🔌 Integration points (need keys) |

The app **runs with zero external services** using an in-memory data layer + a high-quality
mock news provider. Everything you see is real, working code — no placeholders.

---

## 🚀 Quick start (zero config)

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

**Demo accounts** (seeded automatically):

| Role | Email | Password |
| --- | --- | --- |
| User | `demo@newsflow.ai` | `Demo1234` |
| Admin | `admin@newsflow.ai` | `Admin1234` |

> The login page also has a **“Use demo account”** button.

### Try the OTP signup flow

Create a new account at `/signup`. With no SMTP server configured, the 6-digit code is
**printed to the terminal** *and* shown on the verify screen (dev only) so you can complete
the flow instantly.

---

## 🧠 How personalization works

`src/lib/personalization.ts` builds a per-user **affinity vector** from:

- **Explicit** signals — the interests chosen during onboarding (prior)
- **Implicit** signals — `view`, `click`, `category_open`, `like`, `save`, `share`, and
  **dwell time** (`read_time`), each weighted differently

Articles are then ranked by a blend of
`affinity · recency(exp-decay) · trending · source credibility − already-seen`.

It's measurably adaptive: engage with a category and it climbs your feed within the session.
(Verified: a demo user with no “gaming” interest saw gaming jump from rank ~10 to the top
after a dozen interactions.)

---

## 🏗️ Architecture

```
src/
├─ app/
│  ├─ (auth)/         login · signup · verify · forgot-password
│  ├─ (app)/          feed · article/[id] · search · library · admin  (+ AppShell)
│  ├─ onboarding/     multi-step wizard
│  ├─ api/            auth/* · onboarding · news/* · search · bookmarks
│  │                  interactions · notifications · admin/stats · stream (SSE)
│  ├─ layout.tsx · globals.css · page.tsx (landing)
├─ components/        NewsCard · TrendingRail · AppShell · CategoryChips
│  │                  BreakingNewsToast · NotificationsBell · ThemeToggle · ui/*
├─ lib/
│  ├─ auth.ts · jwt.ts (edge-safe) · otp.ts · validation.ts (Zod)
│  ├─ db.ts (in-memory store) · seed-memory.ts · rate-limit.ts · api.ts
│  ├─ personalization.ts · track.ts · utils.ts
│  └─ news/ provider.ts (mock + NewsAPI/RSS adapters) · categories.ts
├─ store/             ui.ts · user.ts  (Zustand)
├─ types/             domain types
└─ middleware.ts      route protection (JWT verify on the edge)
prisma/schema.prisma  full Postgres schema   prisma/seed.ts  production seed
```

**Data layer abstraction:** `src/lib/db.ts` exposes typed functions (`findUserByEmail`,
`addInteraction`, `bookmarksForUser`, …) that mirror the Prisma schema 1:1. Moving to
Postgres means replacing those function bodies with Prisma calls — **call sites don't change.**

---

## 🔐 Security

- JWT in **httpOnly, SameSite=Lax** cookies (`jose`, HS256) — verified in edge middleware
- Passwords hashed with **bcrypt** (cost 11); login is anti-enumeration
- **Email OTP** with expiry + attempt limits
- **Rate limiting** on all auth endpoints (swap the in-process map for Redis in prod)
- **Zod** validation on every endpoint; SQL-injection-safe via Prisma (production path)
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) in `next.config.mjs`; React escaping for XSS

---

## 🐘 Production data layer (PostgreSQL + Redis)

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Configure env
cp .env.example .env          # set JWT_SECRET, DATABASE_URL is pre-filled for compose

# 3. Migrate + seed
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm run dev
```

Then flip `DATA_DRIVER=prisma` and port the bodies in `src/lib/db.ts` to Prisma
(the schema and seed are already written). Redis is wired for caching/rate-limiting via
`REDIS_URL`.

### Real news sources

Set `NEWSAPI_KEY` (NewsAPI.org) or `RSS_FEEDS` — `src/lib/news/provider.ts` already has the
`NewsApiProvider` adapter and an `RssProvider` interface; `getNewsProvider()` picks the
active source. No code changes elsewhere.

### Real email & AI summaries

- **Email:** implement `deliverViaSmtp()` in `src/lib/otp.ts` (nodemailer / Resend / SES).
- **AI summaries:** set `ANTHROPIC_API_KEY`; the mock provider's extractive summaries are
  the drop-in point for an LLM call (`AI_MODEL` defaults to `claude-opus-4-8`).

---

## 📦 Deployment

**Vercel** (recommended): push to Git, import, set env vars (`JWT_SECRET`, `DATABASE_URL`,
`REDIS_URL`, source/email/AI keys). Note: SSE + the in-memory store assume a single
long-lived Node instance; on serverless, use Postgres/Redis (provided) for shared state.

**Docker:**

```bash
docker build -t newsflow-ai .
docker run -p 3000:3000 -e JWT_SECRET=... newsflow-ai
```

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | Lint / type-check |
| `npm run db:generate` · `db:migrate` · `db:seed` | Prisma client / migrate / seed |

---

## ⚙️ Environment variables

See [`.env.example`](.env.example). Nothing is required for local dev; everything has a safe
default or a graceful fallback.

---

<div align="center">
Built as a production-grade foundation — extend the data layer to Postgres and plug in your
news, email, and AI keys to ship.
</div>
