# CoverFlow

**Benefit Intelligence Platform** — every eligible purchase automatically becomes protected, monitored, and claim-ready.

Premium cards bundle genuinely valuable protection (purchase protection, extended warranty, return protection, travel cover) that almost nobody uses, because the benefit is invisible at the moment of purchase and only surfaces after something has already gone wrong. CoverFlow flips that: it watches card transactions in real time, activates the right protection the instant you pay, stores the receipt, tracks every coverage window on a living timeline, and keeps the claim prepared before you ever need it.

Built for the American Express Hackathon.

---

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev
```

- Web → http://localhost:3000
- API → http://localhost:4000 (auto-migrates + seeds a demo world on first boot)

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | `demo@coverflow.app` | `demo1234` |
| Admin | `admin@coverflow.app` | `admin1234` |
| Support | `support@coverflow.app` | `support1234` |

Hit **Simulate purchase** on the dashboard (or check out in the Demo Store) and watch a live
authorization flow through the pipeline into activated coverage in under a second.

---

## What's inside

```
apps/web        Next.js 15 · React 19 · TypeScript · Tailwind v4 · Framer Motion
services/api    Node · Express · better-sqlite3 · JWT auth · SSE live stream · nodemailer
```

**Eight engines, one lifecycle**

1. **Purchase Intelligence** — reads every card authorization the moment it clears
2. **Benefit Knowledge** — coverage rules stored as versioned configuration, editable without a deploy
3. **Decision Engine** — activates protection with a full, explainable evaluation trace
4. **Receipt Intelligence** — OCR captures merchant, invoice, serial number and warranty
5. **Benefit Timeline** — return window, warranty, coverage end and claim deadline, tracked automatically
6. **AI Claim Assistant** — pre-fills the whole claim; you answer one question
7. **Fraud Detection** — risk-scores every claim with named, auditable flags
8. **Benefit Insights** — shows exactly what the card protected each month

**Notable features**

- **Real authentication** — register, email verification, password reset, JWT access + refresh rotation, RBAC
- **Real transactional email** (nodemailer) — welcome, protection-activated, claim submitted, claim decision, coverage-expiring. Uses SMTP when configured, otherwise an Ethereal preview inbox so every message is inspectable.
- **Proof of Coverage** — generate a public, revocable, expiring link that proves a purchase is protected without exposing your account, card or any other purchase
- **Light / dark theme** with a floating glass UI and live-streaming dashboard

---

## Configuration

Copy `.env.example` and set what you need — everything has a working fallback, so nothing is required for local dev.

| Variable | Purpose | Fallback |
|----------|---------|----------|
| `JWT_SECRET` | token signing | dev secret |
| `WEB_ORIGIN` | CORS + email links | `http://localhost:3000` |
| `SMTP_HOST/PORT/USER/PASS` | real email delivery | Ethereal test inbox |
| `NEXT_PUBLIC_API_URL` | web → API base URL | `http://localhost:4000` |

---

## Deploy

See [DEPLOY.md](./DEPLOY.md). In short: the **web app** goes on Vercel, the **API** goes on a
persistent host (Render / Railway), and the web's `NEXT_PUBLIC_API_URL` points at the API.

## License

MIT — see [LICENSE](./LICENSE).
