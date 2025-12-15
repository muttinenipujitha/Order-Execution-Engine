import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";

describe("Idempotency via clientOrderId", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("returns same orderId when clientOrderId repeats", async () => {
    const payload = { orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:1, slippageBps:50, clientOrderId:"abc-123" };

    const r1 = await sys.app.inject({ method:"POST", url:"/api/orders/execute", payload });
    const r2 = await sys.app.inject({ method:"POST", url:"/api/orders/execute", payload });

    expect(r1.statusCode).toBe(202);
    expect(r2.statusCode).toBe(202);

    expect(r1.json().orderId).toBe(r2.json().orderId);
  });
});
