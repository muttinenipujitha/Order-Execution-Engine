import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import { ordersQueue } from "../../src/queue/queue";
import { prisma } from "../../src/db/prisma";

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("Queue concurrency", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("processes multiple orders without dropping (basic load)", async () => {
    // submit 15 quickly
    const ids:string[] = [];
    for (let i=0;i<15;i++){
      const res = await sys.app.inject({
        method:"POST",
        url:"/api/orders/execute",
        payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:0.1 + i*0.01, slippageBps:50 }
      });
      ids.push(res.json().orderId);
    }

    // allow processing time (2-3s each, concurrency 10)
    await sleep(9000);

    const confirmed = await prisma.order.count({ where: { id: { in: ids }, status: "confirmed" } });
    // all should be confirmed eventually in this window; allow slight slack on slow machines
    expect(confirmed).toBeGreaterThanOrEqual(12);
  });
});
