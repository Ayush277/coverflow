# CoverFlow REST API

Base URL: `http://localhost:4000`. All responses are JSON. Errors use
`{ "error": "CODE", "message": "human readable" }` with proper HTTP status
(401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 validation, 400 domain).

Authentication: `Authorization: Bearer <accessToken>` (JWT, 30 min).
Refresh via `POST /api/auth/refresh`. Roles: `CUSTOMER`, `SUPPORT`, `ADMIN`.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` | creates user + demo GOLD card |
| POST | `/api/auth/login` | `{email, password}` | |
| POST | `/api/auth/google` | `{credential?}` | verifies Google ID token when `GOOGLE_CLIENT_ID` set; demo identity otherwise |
| POST | `/api/auth/refresh` | `{refreshToken}` | rotates the refresh token |
| POST | `/api/auth/logout` | `{refreshToken?}` | revokes session |
| GET | `/api/auth/me` | — | current user |
| PATCH | `/api/auth/me` | `{name?, preferences?}` | profile + notification/AI preferences |

All auth responses: `{accessToken, refreshToken, user}`.

## Benefits (Wallet + Passport)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/benefits?status=&q=` | wallet; status ∈ ACTIVE, EXPIRING, PENDING_ACTIVATION, CLAIMED, EXPIRED |
| GET | `/api/benefits/:id` | passport: benefit + timeline + claims; includes `decisionTrace` |
| POST | `/api/benefits/:id/activate` | manual activation (MANUAL-decision benefits) |
| GET | `/api/timeline` | aggregate lifecycle events across all protections |

## Demo Store

A real merchant surface. Checkout emits genuine card authorizations onto the event bus — the
pipeline downstream has no special-casing for store orders. Each merchant in the cart becomes
its own authorization (as a card network would settle them) and each gets a merchant receipt.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/store/products?category=&q=` | catalog from the `products` table + available categories |
| POST | `/api/store/checkout` | `{cardId, items:[{productId, quantity}]}` → creates order + one transaction per merchant + auto-receipts, activates benefits, returns `{orderId, total, authorizations[], protectionsActivated}` |
| GET | `/api/store/orders` | order history with line items and linked transaction ids |

## Transactions

| Method | Path | Notes |
|---|---|---|
| GET | `/api/transactions?limit=` | with card + benefit counts |
| POST | `/api/transactions/simulate` | fires a Stripe-Issuing-mock authorization through the full pipeline; product is drawn from the `products` catalog, amount varied ±10% |

## Cards

Only the last four digits and tier are ever persisted — the demo number is Luhn-validated in
memory and discarded. No schema column exists for a PAN, CVV or expiry.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cards` | user's cards with transaction counts |
| POST | `/api/cards` | `{number, tier}` → validates Luhn + length, stores last4 only; 422 on bad checksum, 409 on duplicate |
| POST | `/api/cards/:id/default` | set the one-tap checkout card |
| DELETE | `/api/cards/:id` | deletes if unused; **deactivates** if it has transactions so protected purchases survive |

## Receipts (OCR)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/receipts` | parsed receipts with extracted fields |
| POST | `/api/receipts/upload` | multipart `file` (+ optional `transactionId`); runs OCR, links to transaction, completes REMINDER activations, publishes `receipts.uploaded` |

## Claims

| Method | Path | Notes |
|---|---|---|
| POST | `/api/claims/prepare` | `{benefitId, incident}` → pre-filled claim, type classification, AI summary, confidence, missing docs |
| POST | `/api/claims` | `{benefitId, incident, claimType, amountRequested, summary?, confidence?}`; validates claim window + amount, runs fraud scoring, auto-transitions to IN_REVIEW |
| GET | `/api/claims` | user's claims |
| GET | `/api/claims/:id` | claim + event log |
| POST | `/api/claims/:id/withdraw` | only SUBMITTED / IN_REVIEW |

## Notifications, Analytics, Search, Assistant

| Method | Path | Notes |
|---|---|---|
| GET | `/api/notifications` | `{notifications, unread}` |
| POST | `/api/notifications/read` | `{ids?}` — omit to mark all |
| GET | `/api/analytics` | coverage value, protection rate, monthly trend, category mix, claims recovered |
| GET | `/api/search?q=` | benefits + claims + transactions, ⌘K palette |
| GET | `/api/assistant/history` | chat history |
| POST | `/api/assistant/chat` | `{message}` → `{content, sources}` (RAG over policies + live user data) |
| GET | `/api/stream?token=<jwt>` | SSE: `transaction`, `benefit`, `receipt` events |

## Admin (`SUPPORT` + `ADMIN` unless noted)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/analytics` | executive summary: totals, claim rate, processing time, merchants, benefit usage, country/category mix, daily volume |
| GET | `/api/admin/claims?status=` | review queue, fraud-sorted |
| POST | `/api/admin/claims/:id/decision` | `{decision: APPROVED\|REJECTED, note?}`; notifies customer |
| GET | `/api/admin/users` | ADMIN — users with benefit/claim/risk stats |
| PATCH | `/api/admin/users/:id/role` | ADMIN — `{role}`; self-change blocked |
| GET | `/api/admin/rules` | Knowledge Engine rules + usage counts |
| POST | `/api/admin/rules` | ADMIN — create rule (versioned) |
| PATCH | `/api/admin/rules/:id` | ADMIN — update/enable/disable; version bumps |
| GET | `/api/admin/fraud` | scoring events + high-risk users |
| GET | `/api/admin/audit` | ADMIN — audit trail |

## Events (Pub/Sub topics)

| Topic | Producer | Consumers |
|---|---|---|
| `transactions.created` | Stripe Issuing mock / simulate endpoint | Purchase Intelligence (rules → benefits → timeline → notify → SSE) |
| `receipts.uploaded` | receipt upload | λ receipt-parser (association + activation) |
| `claims.submitted` | claim submission | λ claim-preprocessor / admin alerting |
| `benefits.activated` | Decision Engine | analytics, SSE |
| `notifications.created` | Notification Engine | delivery channels |
