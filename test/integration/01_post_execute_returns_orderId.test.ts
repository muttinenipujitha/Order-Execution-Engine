import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";

describe("POST /api/orders/execute", () => {
  let sys: any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("returns 202 with orderId and wsUrl", async () => {
    const res = await sys.app.inject({
      method: "POST",
      url: "/api/orders/execute",
      payload: { orderType: "market", tokenIn: "SOL", tokenOut: "USDC", amountIn: 0.5, slippageBps: 50 }
    });
    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.orderId).toBeTruthy();
    expect(body.wsUrl).toContain("/api/orders/execute?orderId=");
  });
});
