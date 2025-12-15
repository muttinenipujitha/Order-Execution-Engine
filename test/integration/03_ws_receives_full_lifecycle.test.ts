import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSystem, stopSystem, resetDb, flushRedis } from "./_helpers";
import WebSocket from "ws";

function waitForSequence(ws: WebSocket, expected: string[], timeout=25000) {
  return new Promise<string[]>((resolve, reject) => {
    const got: string[] = [];
    const t = setTimeout(() => reject(new Error("timeout, got: " + got.join(","))), timeout);

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg?.status) {
        // only record first time each status appears
        if (!got.includes(msg.status)) got.push(msg.status);
        const ok = expected.every((s, i) => got[i] === s);
        if (got.length >= expected.length && ok) {
          clearTimeout(t);
          resolve(got);
        }
      }
    });
  });
}

describe("WebSocket lifecycle", () => {
  let sys:any;
  beforeAll(async () => { sys = await startSystem(); });
  afterAll(async () => { await stopSystem(sys.app, sys.worker); });
  beforeEach(async () => { await resetDb(); await flushRedis(); });

  it("streams pending→routing→building→submitted→confirmed", async () => {
    const res = await sys.app.inject({
      method:"POST",
      url:"/api/orders/execute",
      payload:{ orderType:"market", tokenIn:"SOL", tokenOut:"USDC", amountIn:0.75, slippageBps:50 }
    });
    const { orderId } = res.json();

    const ws = new WebSocket(`ws://127.0.0.1:${sys.port}/api/orders/execute?orderId=${orderId}`);
    const seq = await waitForSequence(ws, ["pending","routing","building","submitted","confirmed"]);
    ws.close();
    expect(seq).toEqual(["pending","routing","building","submitted","confirmed"]);
  });
});
