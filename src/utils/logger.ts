export const logger =
  process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }
    : true;
