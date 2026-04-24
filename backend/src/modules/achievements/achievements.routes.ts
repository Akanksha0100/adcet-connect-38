import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./achievements.controller.js";
import {
  achievementInputSchema,
  listQuerySchema,
  moderationSchema,
} from "./achievements.validators.js";

export const achievementsRouter = Router();

achievementsRouter.get("/", optionalAuth, validate(listQuerySchema, "query"), asyncHandler(ctrl.list));
achievementsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
achievementsRouter.post("/", requireAuth, validate(achievementInputSchema), asyncHandler(ctrl.create));
achievementsRouter.patch(
  "/:id",
  requireAuth,
  validate(achievementInputSchema.partial()),
  asyncHandler(ctrl.update),
);
achievementsRouter.delete("/:id", requireAuth, asyncHandler(ctrl.remove));
achievementsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);