import { prisma } from "../db/prisma";
import { redis } from "../db/redis";
import { wsHub, type StatusPayload } from "../ws/wsHub";
import { ordersQueue } from "../queue/queue";
import { env } from "../config/env";

export type CreateOrderInput = {
  orderType: "market";
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippageBps: number;
  clientOrderId?: string;
};

export async function createOrderAndEnqueue(input: CreateOrderInput) {
  if (input.clientOrderId) {
    const existing = await prisma.order.findUnique({ where: { clientOrderId: input.clientOrderId } });
    if (existing) return { orderId: existing.id, wsUrl: `/api/orders/execute?orderId=${existing.id}` };
  }

  const order = await prisma.order.create({
    data: {
      clientOrderId: input.clientOrderId,
      status: "pending",
      orderType: "market",
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amountIn: input.amountIn,
      slippageBps: input.slippageBps
    }
  });

  await emitStatus(order.id, "pending", { queued: true });

  await ordersQueue.add(
    env.QUEUE_NAME,
    { orderId: order.id },
    { jobId: order.id, attempts: env.MAX_ATTEMPTS, backoff: { type: "exponential", delay: 500 } }
  );

  return { orderId: order.id, wsUrl: `/api/orders/execute?orderId=${order.id}` };
}

export async function emitStatus(orderId: string, status: StatusPayload["status"], data?: any) {
  const timestamp = new Date().toISOString();

  await prisma.orderEvent.create({ data: { orderId, status, data: data ?? undefined } });
  await prisma.order.update({ where: { id: orderId }, data: { status } });

  await redis.set(
    `active_orders:${orderId}`,
    JSON.stringify({ orderId, status, timestamp, data }),
    "EX",
    3600
  );

  wsHub.publish({ orderId, status, timestamp, data });
}

export async function patchOrder(orderId: string, patch: Partial<{
  chosenDex: "raydium" | "meteora";
  quoteJson: any;
  executedPrice: number;
  txHash: string;
  failureReason: string;
  attempts: number;
  status: StatusPayload["status"];
}>) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      chosenDex: patch.chosenDex as any,
      quoteJson: patch.quoteJson,
      executedPrice: patch.executedPrice as any,
      txHash: patch.txHash,
      failureReason: patch.failureReason,
      attempts: patch.attempts,
      status: patch.status as any
    }
  });
}

export async function getOrderEvents(orderId: string) {
  return prisma.orderEvent.findMany({ where: { orderId }, orderBy: { id: "asc" } });
}
