import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./jobs.controller.js";
import {
  applySchema,
  closeSchema,
  jobInputSchema,
  jobListQuery,
  moderationSchema,
} from "./jobs.validators.js";

export const jobsRouter = Router();

jobsRouter.get("/", requireAuth, requireApproved, validate(jobListQuery, "query"), asyncHandler(ctrl.list));
jobsRouter.get("/me/applications", requireAuth, requireApproved, asyncHandler(ctrl.myApplications));
jobsRouter.get(
  "/mine/posted",
  requireAuth,
  requireApproved,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.myPosted),
);
// Admin: all jobs with any status
jobsRouter.get(
  "/admin/all",
  requireAuth,
  requireAdmin,
  validate(jobListQuery, "query"),
  asyncHandler(ctrl.list),
);
jobsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
jobsRouter.get("/:id", requireAuth, requireApproved, asyncHandler(ctrl.getById));
jobsRouter.post("/", requireAuth, requireApproved, validate(jobInputSchema), asyncHandler(ctrl.create));
jobsRouter.patch("/:id", requireAuth, requireApproved, validate(jobInputSchema.partial()), asyncHandler(ctrl.update));
jobsRouter.delete("/:id", requireAuth, requireApproved, asyncHandler(ctrl.remove));

jobsRouter.post("/:id/apply", requireAuth, requireApproved, validate(applySchema), asyncHandler(ctrl.apply));
// Admin OR job-poster can see applications
jobsRouter.get("/:id/applications", requireAuth, requireApproved, asyncHandler(ctrl.listApplications));

jobsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);

jobsRouter.post(
  "/:id/close",
  requireAuth,
  requireApproved,
  validate(closeSchema),
  asyncHandler(ctrl.setClosed),
);