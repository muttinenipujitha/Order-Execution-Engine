import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(10),
  REDIS_URL: z.string().min(10),
  QUEUE_NAME: z.string().default("orders"),
  MAX_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(10),
  MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
});
export const env = EnvSchema.parse(process.env);
