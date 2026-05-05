/**
 * Express app composition. Pure wiring — no listening here, no business logic.
 * Easier to import in tests without spinning up a network port.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { loadOpenApiSpec } from "./config/openapi.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { globalLimiter } from "./middlewares/rateLimit.js";

export const buildApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (env.NODE_ENV !== "test") app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(globalLimiter);

  // Static fallback for the local-disk storage adapter.
  if (env.STORAGE_DRIVER === "local") {
    app.use("/uploads", express.static(env.LOCAL_STORAGE_DIR));
  }

  // OpenAPI / Swagger UI
  try {
    const spec = loadOpenApiSpec();
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec as Record<string, unknown>));
    app.get("/api/openapi.json", (_req, res) => res.json(spec));
  } catch {
    // openapi.yaml not present — skip silently.
  }

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};