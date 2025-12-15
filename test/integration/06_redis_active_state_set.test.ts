import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import { redis } from "../../src/db/redis";

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("Redis active state", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("sets active_orders:<id> with ttl", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:0.9, slippageBps:50 }
    });
    const { orderId } = res.json();

    await sleep(400);

    const val = await redis.get(`active_orders:${orderId}`);
    expect(val).toBeTruthy();

    const ttl = await redis.ttl(`active_orders:${orderId}`);
    expect(ttl).toBeGreaterThan(0);
  });
});
