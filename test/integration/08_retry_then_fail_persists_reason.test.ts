import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import { prisma } from "../../src/db/prisma";

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("Retries and final failed", () => {
  let sys:any;

  beforeAll(async () => {
    process.env.FAIL_RATE = "1"; // force failures for this suite
    sys = await startSystem();
  });

  afterAll(async () => {
    await stopSystem(sys.app, sys.worker);
    process.env.FAIL_RATE = "0";
  });

  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("fails after max attempts and stores failureReason", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:0.33, slippageBps:50 }
    });
    const { orderId } = res.json();

    // attempts: 3 with exponential backoff => allow enough time
    await sleep(9000);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("failed");
    expect(order?.failureReason).toBeTruthy();

    const events = await prisma.orderEvent.findMany({ where: { orderId }, orderBy: { id: "asc" } });
    expect(events.some(e => e.status === "failed")).toBe(true);
  });
});
