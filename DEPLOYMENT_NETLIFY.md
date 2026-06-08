# Deploying NewsFlow AI to Netlify

> ⚠️ **Important:** NewsFlow is a full Next.js app with API routes, middleware,
> and server rendering. **Drag‑and‑drop "deploy folder" will NOT work** — that
> only serves static files, so login/signup/news APIs won't run. You must let
> Netlify **build** the app (Git‑connected deploy, or the CLI with `--build`).
> If signup did nothing before, this was almost certainly part of the cause.

The repo already includes `netlify.toml`, which sets the build command, Node
version, and the official Next.js runtime plugin. You don't need to configure
build settings manually.

---

## Option A — Git‑connected (recommended)

1. Push this project to a GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify reads `netlify.toml` automatically (build `npm run build`, Node 20,
   `@netlify/plugin-nextjs`). Just click **Deploy**.
4. Add environment variables (below), then **Deploy → Trigger deploy**.

## Option B — Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init          # link to a site
netlify deploy --build --prod   # builds on your machine and ships it
```

---x

## Environment variables

Set these in **Site configuration → Environment variables**, then redeploy.

| Variable | Required? | What it does |
|---|---|---|
| `JWT_SECRET` | **Strongly recommended** | Signs sessions + encrypts OTP tickets. Use a long random value. Generate: `openssl rand -base64 48` |
| `NEWS_SOURCE` | Optional | `rss` (default) for live news, or `mock` for offline/demo |
| `RESEND_API_KEY` | Optional | Sends real OTP emails. Free key at resend.com. Without it, the OTP shows on the verify screen (demo mode) |
| `EMAIL_FROM` | Optional | e.g. `NewsFlow AI <onboarding@resend.dev>` (use `onboarding@resend.dev` until you verify a domain) |
| `UPSTASH_REDIS_REST_URL` | Optional* | Durable accounts/bookmarks/history (serverless‑safe) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional* | Pair with the URL above |
| `NEXT_PUBLIC_APP_URL` | Optional | Your site URL, for SEO/OG metadata |

\* **Without Upstash, new accounts and bookmarks won't persist between sessions**
on Netlify (each serverless instance has its own memory). The seeded demo login
always works. Add Upstash to make real accounts durable.

### Get durable storage (Upstash Redis — free, ~2 min)

1. Create an account at **https://upstash.com** → **Create Database** (Redis).
2. Open the database → **REST API** tab.
3. Copy **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** into
   Netlify env vars. Redeploy. That's it — the app auto‑switches to Redis.

### Get real OTP emails (Resend — free)

1. Sign up at **https://resend.com**, create an API key.
2. Add `RESEND_API_KEY` (and optionally `EMAIL_FROM`) to Netlify env vars.
3. While testing you can send from `onboarding@resend.dev` (delivers to your own
   account email). To email anyone, verify your domain in Resend.

---

## Demo accounts (always available)

- **User:** `demo@newsflow.ai` / `Demo1234`
- **Admin:** `admin@newsflow.ai` / `Admin1234`

## Notes

- **Real‑time:** breaking‑news SSE needs a long‑lived server, which serverless
  doesn't provide — the feed instead **auto‑refreshes every 10 minutes** and the
  notifications bell polls, so it stays current on Netlify.
- **Themes / text size** are saved per device (localStorage); all other
  preferences are stored with the account.
