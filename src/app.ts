import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ordersRoutes } from "./routes/orders";
import { logger } from "./utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = Fastify({ logger });
  await app.register(websocket);
  await app.register(fastifyStatic, { root: path.join(__dirname, "..", "public"), prefix: "/" });
  await app.register(ordersRoutes, { prefix: "/api/orders" });
  app.get("/health", async () => ({ ok: true }));
  return app;
}
