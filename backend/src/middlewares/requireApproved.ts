/**
 * Block non-APPROVED users from a route. Use after `requireAuth` on data
 * endpoints that should be inaccessible until an admin has approved the
 * account. Admins are always allowed through.
 *
 * The user's account information, profile, notifications and avatar uploads
 * remain available so the "awaiting approval" / "rejected" screens can render.
 */
import type { NextFunction, Request, Response } from "express";
import { Forbidden, Unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export const requireApproved = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth) return next(Unauthorized());
  if (req.auth.roles.includes("ADMIN")) return next();
  // Cheap check — the user row carries the live status.
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    select: { status: true },
  });
  if (!user) return next(Unauthorized());
  if (user.status !== "APPROVED") {
    return next(Forbidden("Account pending approval"));
  }
  next();
};