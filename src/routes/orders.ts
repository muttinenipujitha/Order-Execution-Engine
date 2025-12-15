import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createOrderAndEnqueue, getOrderEvents } from "../services/orderService";
import { wsHub } from "../ws/wsHub";

const OrderSchema = z.object({
  orderType: z.literal("market"),
  tokenIn: z.string().min(2),
  tokenOut: z.string().min(2),
  amountIn: z.number().positive(),
  slippageBps: z.number().int().min(1).max(2000).default(50),
  clientOrderId: z.string().optional()
});

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  app.post("/execute", async (req, reply) => {
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await createOrderAndEnqueue(parsed.data);
    return reply.code(202).send(result);
  });

  app.get("/execute", { websocket: true }, async (conn, req) => {
    const orderId = (req.query as any)?.orderId as string | undefined;
    if (!orderId) {
      conn.socket.send(JSON.stringify({ error: "Missing orderId" }));
      conn.socket.close();
      return;
    }
    wsHub.subscribe(orderId, conn.socket);

    const events = await getOrderEvents(orderId);
    for (const e of events) {
      conn.socket.send(JSON.stringify({
        orderId,
        status: e.status,
        timestamp: e.createdAt,
        data: e.data
      }));
    }
  });
};
