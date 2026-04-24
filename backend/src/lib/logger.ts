/**
 * Structured logger. Pino is fast and JSON-friendly for production aggregation.
 * In dev we keep a human-readable transport.
 */
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
});