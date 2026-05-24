# Allo Inventory — Take-Home Exercise

A full-stack inventory reservation system built with Next.js 14, Prisma, Supabase, and Upstash Redis. Solves the checkout race-condition problem using distributed locking and atomic database transactions.

---


## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (end-to-end) |
| Database | Supabase (hosted PostgreSQL) |
| ORM | Prisma |
| Distributed Lock | Upstash Redis |
| Validation | Zod |
| Styling | Tailwind CSS + custom CSS variables |
| Hosting | Vercel |

---

## How to Run Locally

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/allo-inventory
cd allo-inventory
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, strong password, and region (e.g. South Asia)
3. Wait ~2 minutes for provisioning
4. Go to **Settings → Database → Connection string**
5. Copy two URLs:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler or direct** (port 5432) → `DIRECT_URL`

### 3. Set up Upstash Redis

1. Go to [upstash.com](https://upstash.com) → **Create Database**
2. Choose **Global** type, nearest region
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.bmjanqnhdkapujfyoipu:pfic2EmTr6mSmPha@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.bmjanqnhdkapujfyoipu:pfic2EmTr6mSmPha@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
 UPSTASH_REDIS_REST_URL="https://evolved-tortoise-102691.upstash.io"
 UPSTASH_REDIS_REST_TOKEN="gQAAAAAAAZEjAAIgcDI3N2VlM2M3NWIxZGY0NWZiODI1M2MzNDdlNWViZGE2Yg"
CRON_SECRET="hello-123"
```

### 5. Run migrations and seed

```bash
npm run db:push   # Creates all tables in Supabase
npm run db:seed   # Seeds 3 warehouses + 6 products with stock
```

### 6. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## How Expiry Works in Production

**Dual-layer approach:**

1. **Vercel Cron (proactive):** `vercel.json` schedules `GET /api/cron/expire` every minute. It queries all `PENDING` reservations where `expiresAt < NOW()` and releases them in atomic transactions, decrementing `reserved` counts.

2. **Lazy expiry on confirm (defensive):** When a user tries to confirm a reservation, the `/confirm` endpoint checks `expiresAt` again. Even if the cron job hasn't run yet, attempting to confirm an expired reservation will return `410 Gone` and release the hold immediately.

This means units are returned to available inventory within at most 1 minute after expiry.

---

## Concurrency Strategy

The reservation endpoint uses a **Redis distributed lock** (SET NX EX) to ensure only one reservation request can proceed per `productId + warehouseId` combination at a time.

```
Request A ──── acquireLock("lock:reserve:productX:wh1") ──── ✅ acquired
Request B ──── acquireLock("lock:reserve:productX:wh1") ──── ❌ returns 429
```

Within the lock:
1. Re-read stock from DB to get a consistent view
2. Check `total - reserved >= quantity`
3. If insufficient: return 409
4. If sufficient: run `prisma.$transaction([createReservation, incrementReserved])`
5. Always release the lock in `finally`

The Prisma transaction ensures the `Reservation` row and `Stock.reserved` increment are committed atomically — no partial writes.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support idempotency via the `Idempotency-Key` header.

- On first request: process normally, cache the response in Redis with `idem:{action}:{key}` for the duration of the reservation window.
- On retry with the same key: return the cached response immediately with `X-Idempotent-Replay: true` header, no DB side effects.

This protects against double-charges in flaky network conditions (e.g., UPI timeout + user retry).

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List all products with per-warehouse available stock |
| GET | `/api/warehouses` | List all warehouses |
| POST | `/api/reservations` | Create a reservation. Body: `{ productId, warehouseId, quantity }` |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation (returns 410 if expired) |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/cron/expire` | Cron endpoint — releases all expired pending reservations |

### Error Codes

| Code | Meaning |
|---|---|
| 400 | Invalid input / validation failure |
| 404 | Resource not found |
| 409 | Insufficient stock |
| 410 | Reservation expired |
| 429 | Lock contention — retry |
| 500 | Server error |

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

In Vercel Dashboard → **Settings → Environment Variables**, add:
- `DATABASE_URL`
- `DIRECT_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Then redeploy:
```bash
vercel --prod
```

---

## Trade-offs & What I'd Do Differently

**What I'd add with more time:**
- User authentication (sessions/JWT) — reservations are currently anonymous
- Pagination for product listing
- Unit + integration tests (Jest + Supertest)
- Postgres advisory locks as an alternative to Redis (simpler infra)
- WebSocket or Server-Sent Events for real-time stock updates on the product page
- Structured logging (Pino) and error tracking (Sentry)
- Rate limiting per IP on the reservation endpoint

**Deliberate trade-offs:**
- Redis lock has a 15-second TTL. Under extreme load, a request could theoretically time out and leave a stale lock, but the TTL ensures self-healing within 15 seconds.
- The cron approach for expiry means there can be up to ~1 minute of lag before expired units reappear, but the lazy-expiry on `/confirm` makes this invisible to the purchasing flow.
- No database-level row locks (SELECT FOR UPDATE) — Redis locking at the application layer is simpler to reason about in a distributed Next.js + serverless environment.
