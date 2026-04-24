/**
 * Global error handler. Maps `ApiError` to HTTP, hides stack in production,
 * and logs everything via the structured logger.
 */
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Zod (defensive — usually caught by validate middleware)
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: "UNPROCESSABLE", message: "Validation failed", details: err.flatten() },
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Unique constraint violation", details: err.meta },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found" } });
    }
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Internal server error",
      ...(env.NODE_ENV !== "production" && { stack: (err as Error)?.stack }),
    },
  });
};