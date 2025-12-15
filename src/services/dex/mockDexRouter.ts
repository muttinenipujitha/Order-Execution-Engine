import { sleep } from "../../utils/sleep";

export type Quote = { dex: "raydium" | "meteora"; price: number; feeBps: number; liquidityScore: number };

export class MockDexRouter {
  constructor(private basePrice = 1.0) {}  

  async getRaydiumQuote(): Promise<Quote> {
    await sleep(200);
    const price = this.basePrice * (0.98 + Math.random() * 0.04);
    return { dex: "raydium", price, feeBps: 30, liquidityScore: 0.8 + Math.random() * 0.2 };
  }

  async getMeteoraQuote(): Promise<Quote> {
    await sleep(200);
    const price = this.basePrice * (0.97 + Math.random() * 0.05);
    return { dex: "meteora", price, feeBps: 20, liquidityScore: 0.75 + Math.random() * 0.25 };
  }

  pickBest(raydium: Quote, meteora: Quote) {
    const effRay = raydium.price * (1 - raydium.feeBps / 10_000);
    const effMet = meteora.price * (1 - meteora.feeBps / 10_000);
    const best = effRay >= effMet ? raydium : meteora;
    const other = best.dex === "raydium" ? meteora : raydium;
    return { best, other, effective: { raydium: effRay, meteora: effMet }, reason: "best_fee_adjusted_price" };
  }

  async executeSwap(best: Quote, amountIn: number, slippageBps: number) {
    await sleep(2000 + Math.random() * 1000);
    const slippage = Math.random() * (slippageBps / 10_000);
    const executedPrice = best.price * (1 - slippage);
    const txHash = "mock_" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    return { txHash, executedPrice, amountIn };
  }
}
