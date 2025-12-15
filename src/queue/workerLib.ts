import { Worker } from "bullmq";
import { env } from "../config/env";
import { processOrderJob } from "../services/execution/executor";
import { emitStatus, patchOrder } from "../services/orderService";

export function startWorker() {
  const worker = new Worker(env.QUEUE_NAME, processOrderJob, {
    connection: { url: env.REDIS_URL },
    concurrency: env.MAX_CONCURRENCY
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const orderId = (job.data as any).orderId as string;

    const attemptsMade = job.attemptsMade;
    const max = job.opts.attempts ?? env.MAX_ATTEMPTS;

    if (attemptsMade >= max) {
      await patchOrder(orderId, { status: "failed", failureReason: err.message, attempts: attemptsMade });
      await emitStatus(orderId, "failed", { error: err.message, attempts: attemptsMade });
    } else {
      await emitStatus(orderId, "pending", { retrying: true, error: err.message, attempt: attemptsMade });
    }
  });

  return worker;
}
