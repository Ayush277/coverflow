# Deploying CoverFlow

CoverFlow is two pieces:

- **`apps/web`** — the Next.js frontend → **Vercel**
- **`services/api`** — a persistent Express server (SQLite + a live SSE stream + a background
  simulator) → **Render** or **Railway**. It is *not* serverless, so it does **not** belong on
  Vercel functions.

You deploy the API first, then point the web app at it.

---

## 1 · API → Render (free tier)

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Connect this GitHub repo. Render reads [`render.yaml`](./render.yaml) and proposes the
   `coverflow-api` web service automatically.
3. Set the `WEB_ORIGIN` env var to the Vercel URL you'll use (e.g. `https://coverflow.vercel.app`).
   You can update it after step 2 if you don't know the URL yet.
4. **Create** → wait for the build. Health check is `GET /health`.
5. Copy the service URL, e.g. `https://coverflow-api.onrender.com`.

> Render's free tier spins the service down when idle; the first request after a while takes a
> few seconds to wake. Fine for a demo.

## 2 · Web → Vercel

1. Go to <https://vercel.com/new> → import this GitHub repo.
2. **Root Directory** → `apps/web`.
3. Framework is auto-detected as **Next.js**. Leave build/output defaults.
4. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = the Render URL from step 1 (e.g. `https://coverflow-api.onrender.com`)
5. **Deploy**. You'll get a live URL like `https://coverflow.vercel.app`.

## 3 · Wire them together

- Back on Render, make sure `WEB_ORIGIN` matches your final Vercel URL (for CORS + email links),
  then redeploy the API.

Done — open the Vercel URL and sign in with `demo@coverflow.app` / `demo1234`.

---

## Optional: real email

Both hosts work without email config (an Ethereal preview inbox is used, and every message is
inspectable in-app). To send real mail, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
on the Render service.

## Local

```bash
npm install
npm run dev   # web :3000 + api :4000
```
