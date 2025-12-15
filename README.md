# Order Execution Engine — Market Order + DEX Routing + WebSocket (Mock)

A production-style Order Execution Engine that processes Market Orders with automatic DEX routing (Raydium vs Meteora) and real-time WebSocket lifecycle updates.

This project focuses on backend architecture, concurrency, routing transparency, persistence, and real-time observability using a mock DEX execution layer.

---

## Why Market Orders?

Market orders demonstrate the complete execution lifecycle immediately without requiring trigger logic such as price watchers or launch detection.

They clearly showcase:
- End-to-end execution flow
- Routing decisions
- Queue management
- WebSocket-based real-time updates

---

## Extending to Limit and Sniper Orders

Limit and Sniper orders can be supported by adding a trigger stage before execution.

- Limit orders wait for a target price
- Sniper orders wait for token launch or migration

The same DEX router, BullMQ queue, worker, persistence layer, and WebSocket streaming logic can be reused without architectural changes.

---

## API to WebSocket Pattern (Important Clarification)

The assignment mentions upgrading the same HTTP connection from POST to WebSocket.

In real-world systems, WebSockets require an HTTP GET upgrade handshake and cannot be initiated from a POST response.

This implementation follows an industry-standard pattern:

1. Client submits order via POST
2. Server validates and returns an orderId
3. Client opens a WebSocket connection using:
   /api/orders/execute?orderId=<orderId>
4. Server replays existing events and streams future updates in real time

This preserves a single logical endpoint while remaining standards-compliant.

---

## High-Level Architecture

Execution flow:
- Client submits order via HTTP POST
- Order is validated and persisted in PostgreSQL
- Order is enqueued into BullMQ
- Worker fetches quotes from Raydium and Meteora concurrently
- Router selects the best execution venue using fee-adjusted pricing
- Execution is simulated with realistic delays
- Each lifecycle step is:
  - Persisted in PostgreSQL as an OrderEvent
  - Cached in Redis for active order tracking
  - Streamed to WebSocket clients in real time

---

## Order Lifecycle (WebSocket Events)

- pending — order received and queued
- routing — comparing DEX prices
- building — building transaction
- submitted — transaction submitted
- confirmed — execution successful with transaction hash and execution price
- failed — execution failed after retries with persisted failure reason

---

## DEX Routing Logic

- Quotes are fetched from Raydium and Meteora
- Effective execution price is calculated after DEX fees
- Best execution venue is selected automatically
- Routing decisions and quotes are streamed for transparency

---

## Concurrency, Rate Limits, and Reliability

- Worker concurrency: 10 simultaneous orders
- Queue rate limit: 100 orders per minute
- Retry strategy: exponential backoff
- Maximum retries: 3
- Final failure persists error and execution metadata

---

## Tech Stack

- Node.js with TypeScript
- Fastify with WebSocket support
- BullMQ with Redis
- PostgreSQL with Prisma ORM
- Redis for active order state caching
- Minimal static UI for order monitoring

---

## Local Setup

Step 1: Start PostgreSQL and Redis  
docker compose up -d

Step 2: Install dependencies and configure environment  
cp .env.example .env  
npm install

Step 3: Generate Prisma client and migrate database  
npx prisma generate  
npx prisma migrate dev --name init

Step 4: Start API and Worker  
npm run dev

---

## Access

UI: http://localhost:3000/  
Health Check: http://localhost:3000/health

---

## API Usage

Execute Market Order  
POST /api/orders/execute

Example request:
curl -X POST http://localhost:3000/api/orders/execute -H "content-type: application/json" -d '{"orderType":"market","tokenIn":"SOL","tokenOut":"USDC","amountIn":0.5,"slippageBps":50}'

Example response:
{"orderId":"uuid","wsUrl":"/api/orders/execute?orderId=uuid"}

---

## WebSocket Subscription

ws://localhost:3000/api/orders/execute?orderId=<ORDER_ID>

---

## Database Models (Prisma)

Order:
- Current status
- Selected DEX
- Execution price
- Transaction hash
- Retry attempts
- Failure reason

OrderEvent:
- Full lifecycle timeline
- Replay support
- Auditing and post-mortem analysis

Schema defined in prisma/schema.prisma.

---

## Tests (Integration)

Includes 10+ integration tests validating:
- DEX routing and price comparison
- WebSocket lifecycle streaming and replay
- Queue concurrency handling
- Retry logic and failure persistence
- Redis active order caching

Run tests:
npm run test:integration

---

## Postman Collection

postman/collection.json

---

## Demo and Deployment

Live Deployment: <PASTE_PUBLIC_URL>  
YouTube Demo: <PASTE_YOUTUBE_LINK>  
GitHub Repository: <PASTE_GITHUB_REPO_URL>

Demo highlights:
- Multiple concurrent order submissions
- Real-time WebSocket lifecycle updates
- DEX routing decisions
- Queue-based concurrent execution

