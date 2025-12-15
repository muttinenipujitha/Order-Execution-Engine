import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import { prisma } from "../../src/db/prisma";

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("Postgres persistence", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("creates OrderEvent timeline with ordered statuses", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:1.1, slippageBps:50 }
    });
    const { orderId } = res.json();

    await sleep(4500);

    const events = await prisma.orderEvent.findMany({ where: { orderId }, orderBy: { id: "asc" } });
    const statuses = events.map(e => e.status);

    expect(statuses[0]).toBe("pending");
    expect(statuses).toContain("routing");
    expect(statuses).toContain("building");
    expect(statuses).toContain("submitted");
    expect(statuses).toContain("confirmed");
  });
});
