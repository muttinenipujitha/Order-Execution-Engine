import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import { prisma } from "../../src/db/prisma";

function wait(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("Routing persists quotes and chosenDex", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("stores quoteJson + chosenDex during lifecycle", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:1, slippageBps:50 }
    });
    const { orderId } = res.json();

    // wait for worker to reach building/submitted
    await wait(1200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order).toBeTruthy();
    expect(order?.chosenDex === "raydium" || order?.chosenDex === "meteora").toBe(true);
    expect(order?.quoteJson).toBeTruthy();
    expect((order?.quoteJson as any).raydium).toBeTruthy();
    expect((order?.quoteJson as any).meteora).toBeTruthy();
  });
});
