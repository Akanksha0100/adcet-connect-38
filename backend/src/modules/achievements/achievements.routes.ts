import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./achievements.controller.js";
import {
  achievementInputSchema,
  listQuerySchema,
  moderationSchema,
} from "./achievements.validators.js";

export const achievementsRouter = Router();

// Public (no auth) — home-page slider feed + shareable single view.
// Declared before the auth-gated routes so "/featured" isn't shadowed by "/:id".
achievementsRouter.get("/featured", asyncHandler(ctrl.listFeatured));
achievementsRouter.get("/public/:id", asyncHandler(ctrl.getPublicById));

achievementsRouter.get("/", requireAuth, requireApproved, validate(listQuerySchema, "query"), asyncHandler(ctrl.list));
achievementsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
achievementsRouter.get("/:id", requireAuth, requireApproved, asyncHandler(ctrl.getById));
achievementsRouter.post("/", requireAuth, requireApproved, validate(achievementInputSchema), asyncHandler(ctrl.create));
achievementsRouter.patch(
  "/:id",
  requireAuth,
  requireApproved,
  validate(achievementInputSchema.partial()),
  asyncHandler(ctrl.update),
);
achievementsRouter.delete("/:id", requireAuth, requireApproved, asyncHandler(ctrl.remove));
achievementsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);