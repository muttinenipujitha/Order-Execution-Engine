import type { Job } from "bullmq";
import { MockDexRouter } from "../dex/mockDexRouter";
import { emitStatus, patchOrder } from "../orderService";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export async function processOrderJob(job: Job) {
  const { orderId } = job.data as { orderId: string };
  const attempt = job.attemptsMade + 1;

  await patchOrder(orderId, { attempts: attempt });
  await emitStatus(orderId, "pending", { attempt });

  if (env.FAIL_RATE > 0 && Math.random() < env.FAIL_RATE) {
    throw new Error("Simulated transient failure");
  }

  await emitStatus(orderId, "routing", { attempt });

  const router = new MockDexRouter(1.0);
  const [rq, mq] = await Promise.all([router.getRaydiumQuote(), router.getMeteoraQuote()]);
  const decision = router.pickBest(rq, mq);

  await patchOrder(orderId, { chosenDex: decision.best.dex, quoteJson: { raydium: rq, meteora: mq, decision } });

  await emitStatus(orderId, "building", { chosenDex: decision.best.dex, quotes: { raydium: rq, meteora: mq }, effective: decision.effective, reason: decision.reason });

  await emitStatus(orderId, "submitted", { chosenDex: decision.best.dex });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  const result = await router.executeSwap(decision.best, Number(order.amountIn), order.slippageBps);

  await patchOrder(orderId, { status: "confirmed", executedPrice: result.executedPrice, txHash: result.txHash });
  await emitStatus(orderId, "confirmed", { txHash: result.txHash, executedPrice: result.executedPrice, chosenDex: decision.best.dex });

  return { ok: true };
}
