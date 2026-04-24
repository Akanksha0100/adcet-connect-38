import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./jobs.controller.js";
import {
  applySchema,
  jobInputSchema,
  jobListQuery,
  moderationSchema,
} from "./jobs.validators.js";

export const jobsRouter = Router();

jobsRouter.get("/", optionalAuth, validate(jobListQuery, "query"), asyncHandler(ctrl.list));
jobsRouter.get("/me/applications", requireAuth, asyncHandler(ctrl.myApplications));
jobsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
jobsRouter.get("/:id", optionalAuth, asyncHandler(ctrl.getById));
jobsRouter.post("/", requireAuth, validate(jobInputSchema), asyncHandler(ctrl.create));
jobsRouter.patch("/:id", requireAuth, validate(jobInputSchema.partial()), asyncHandler(ctrl.update));
jobsRouter.delete("/:id", requireAuth, asyncHandler(ctrl.remove));

jobsRouter.post("/:id/apply", requireAuth, validate(applySchema), asyncHandler(ctrl.apply));
jobsRouter.get("/:id/applications", requireAuth, asyncHandler(ctrl.listApplications));

jobsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);