/**
 * Auth middlewares: parse Bearer token, populate `req.auth`.
 * - `requireAuth` rejects with 401 when missing/invalid.
 * - `optionalAuth` attaches `req.auth` if present but never blocks the request.
 */
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { Unauthorized } from "../lib/errors.js";

const extract = (req: Request) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extract(req);
  if (!token) return next(Unauthorized("Missing bearer token"));
  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(Unauthorized("Invalid or expired token"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extract(req);
  if (!token) return next();
  try {
    req.auth = verifyAccessToken(token);
  } catch {
    /* ignore — anonymous */
  }
  next();
};