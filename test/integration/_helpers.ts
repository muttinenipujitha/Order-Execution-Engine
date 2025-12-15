import { buildApp } from "../../src/app";
import { startWorker } from "../../src/queue/workerLib";
import { prisma } from "../../src/db/prisma";
import { redis } from "../../src/db/redis";
import type { FastifyInstance } from "fastify";

export async function resetDb() {
  // OrderEvent depends on Order, so delete events first
  await prisma.orderEvent.deleteMany({});
  await prisma.order.deleteMany({});
}

export async function flushRedis() {
  await redis.flushdb();
}

export async function startSystem() {
  const app = await buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const worker = startWorker();

  return { app, port, worker };
}

export async function stopSystem(app: FastifyInstance, worker: any) {
  await worker.close();
  await app.close();
}
