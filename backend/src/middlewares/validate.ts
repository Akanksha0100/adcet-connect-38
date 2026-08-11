/**
 * Zod validation middleware. Validates and *replaces* the chosen request slot
 * (body | query | params) with the parsed, type-coerced value.
 */
import type { NextFunction, Request, Response } from "express";
import type { ZodType, ZodTypeDef } from "zod";
import { Unprocessable } from "../lib/errors.js";

type Where = "body" | "query" | "params";

/**
 * Input and output are separate type parameters because a schema may transform:
 * query strings arrive as text and can leave as numbers or arrays (see the
 * comma-separated multi-select filters in `alumni.validators.ts`).
 */
export const validate =
  <TOut, TIn>(schema: ZodType<TOut, ZodTypeDef, TIn>, where: Where = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as unknown as Record<Where, unknown>)[where]);
    if (!result.success) {
      return next(Unprocessable("Validation failed", result.error.flatten()));
    }
    (req as unknown as Record<Where, unknown>)[where] = result.data;
    next();
  };