import { startWorker } from "./queue/workerLib";

startWorker();

process.on("unhandledRejection", (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});