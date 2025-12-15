# Order Execution Engine (Prisma) — Market Order + DEX Routing + WebSocket

## Why Market Orders?
Market orders demonstrate the entire execution lifecycle immediately (routing → build → submit → confirm) without needing a price-watcher (limit) or launch trigger (sniper).

## Extending to Limit/Sniper
Add a trigger stage before enqueueing the execution job (limit: wait for price; sniper: wait for launch/migration event), reusing the same router, worker, WS hub, and persistence.

---

## Run locally

### 1) Start services
```bash
docker compose up -d
```

### 2) Install + env
```bash
cp .env.example .env
npm install
```

### 3) Prisma migrate
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4) Start API + Worker
```bash
npm run dev
```

Open UI:
- http://localhost:3000/

---

## Tests (REAL integration tests)

These tests start the Fastify app + BullMQ worker **in-process** and hit real Postgres + Redis (from docker-compose).

### Run:
1) Ensure docker-compose is up
2) Run:
```bash
npm run test:integration
```

---

## Endpoints
- POST `/api/orders/execute`
- WS `/api/orders/execute?orderId=...`

Status flow:
`pending → routing → building → submitted → confirmed` (or `failed`)

---

## Models
See `prisma/schema.prisma`
- `Order`
- `OrderEvent`
