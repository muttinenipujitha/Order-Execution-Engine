import { Queue } from "bullmq";
import { env } from "../config/env";

export const ordersQueue = new Queue(env.QUEUE_NAME, {
  connection: { url: env.REDIS_URL },
  limiter: { max: 100, duration: 60_000 }
});
