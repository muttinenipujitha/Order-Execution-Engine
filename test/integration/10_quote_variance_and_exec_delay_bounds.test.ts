import { describe, it, expect } from "vitest";
import { MockDexRouter } from "../../src/services/dex/mockDexRouter";

describe("Mock behavior realism", () => {
  it("exec delay is 2-3 seconds bounded", async () => {
    const router = new MockDexRouter(1);
    const q = await router.getRaydiumQuote();
    const t0 = Date.now();
    await router.executeSwap(q, 1, 50);
    const dt = Date.now() - t0;
    expect(dt).toBeGreaterThanOrEqual(1900);
    expect(dt).toBeLessThanOrEqual(3500);
  });

  it("quote variance within bounds", async () => {
    const router = new MockDexRouter(1);
    const rq = await router.getRaydiumQuote();
    const mq = await router.getMeteoraQuote();
    expect(rq.price).toBeGreaterThanOrEqual(0.98);
    expect(rq.price).toBeLessThanOrEqual(1.02);
    expect(mq.price).toBeGreaterThanOrEqual(0.97);
    expect(mq.price).toBeLessThanOrEqual(1.02);
  });
});
