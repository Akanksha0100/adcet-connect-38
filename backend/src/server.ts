/**
 * Server entrypoint. Boots the Express app and handles graceful shutdown.
 */
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { startEventReminderCron } from "./jobs/eventReminders.js";

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, storage: env.STORAGE_DRIVER },
    `🚀 ADCET Alumni API listening on http://localhost:${env.PORT}${env.API_PREFIX}`,
  );
  logger.info(`📚 Swagger UI: http://localhost:${env.PORT}/api/docs`);
});

// Start background jobs
const stopEventReminders = startEventReminderCron();

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down...");
  stopEventReminders();
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandledRejection"));
process.on("uncaughtException", (err) => logger.error({ err }, "uncaughtException"));