/**
 * Role-based access control. Use after `requireAuth`.
 *   router.post("/approve", requireAuth, requireRoles("ADMIN"), handler);
 * Multiple roles are OR'd: any one of the listed roles grants access.
 */
import type { NextFunction, Request, Response } from "express";
import type { AppRoleName } from "../config/constants.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";

export const requireRoles =
  (...allowed: AppRoleName[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(Unauthorized());
    const ok = req.auth.roles.some((r) => allowed.includes(r));
    if (!ok) return next(Forbidden(`Requires role: ${allowed.join(" | ")}`));
    next();
  };

export const requireAdmin = requireRoles("ADMIN");

/** True when the caller owns the resource OR is an admin. */
export const isOwnerOrAdmin = (req: Request, ownerId: string) =>
  !!req.auth && (req.auth.sub === ownerId || req.auth.roles.includes("ADMIN"));