/**
 * Wraps async route handlers so rejected promises are forwarded to Express's
 * error pipeline instead of crashing the process.
 */
import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  <T = unknown>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);