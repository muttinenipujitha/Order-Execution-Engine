import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import WebSocket from "ws";

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

describe("WS history replay", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("replays earlier events when connecting late", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:0.25, slippageBps:50 }
    });
    const { orderId } = res.json();

    await sleep(800); // allow at least routing/building to be recorded

    const ws = new WebSocket(`ws://127.0.0.1:${sys.port}/api/orders/execute?orderId=${orderId}`);

    const received: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 8000);
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.status && !received.includes(msg.status)) received.push(msg.status);
        // should receive earlier pending/routing/building quickly due to replay
        if (received.includes("pending") && received.includes("routing")) {
          clearTimeout(t);
          resolve();
        }
      });
    });

    ws.close();
    expect(received).toContain("pending");
    expect(received).toContain("routing");
  });
});
