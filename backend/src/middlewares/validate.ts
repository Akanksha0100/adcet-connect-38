/**
 * Zod validation middleware. Validates and *replaces* the chosen request slot
 * (body | query | params) with the parsed, type-coerced value.
 */
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { Unprocessable } from "../lib/errors.js";

type Where = "body" | "query" | "params";

export const validate =
  <T>(schema: ZodSchema<T>, where: Where = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as unknown as Record<Where, unknown>)[where]);
    if (!result.success) {
      return next(Unprocessable("Validation failed", result.error.flatten()));
    }
    (req as unknown as Record<Where, unknown>)[where] = result.data;
    next();
  };