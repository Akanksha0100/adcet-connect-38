/**
 * Augments Express's Request with the authenticated user payload set by the auth middleware.
 */
import "express";
import type { AccessClaims } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessClaims;
    }
  }
}

export {};