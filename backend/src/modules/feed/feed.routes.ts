import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./feed.controller.js";
import {
  commentSchema,
  createPostSchema,
  listQuerySchema,
  reportResolveSchema,
  reportSchema,
  reportsQuerySchema,
  updatePostSchema,
} from "./feed.validators.js";

export const feedRouter = Router();

// The whole feed is members-only: no public/unauthenticated surface at all,
// so a shared post link is useless to anyone outside the approved network.
feedRouter.use(requireAuth, requireApproved);

// Admin moderation — declared before "/:id" so "reports" isn't read as an id.
feedRouter.get("/reports", requireAdmin, validate(reportsQuerySchema, "query"), asyncHandler(ctrl.listReports));
feedRouter.patch(
  "/reports/:reportId",
  requireAdmin,
  validate(reportResolveSchema),
  asyncHandler(ctrl.resolveReport),
);

feedRouter.get("/", validate(listQuerySchema, "query"), asyncHandler(ctrl.list));
feedRouter.post("/", validate(createPostSchema), asyncHandler(ctrl.create));
feedRouter.get("/:id", asyncHandler(ctrl.getById));
feedRouter.patch("/:id", validate(updatePostSchema), asyncHandler(ctrl.update));
feedRouter.delete("/:id", asyncHandler(ctrl.remove));

feedRouter.post("/:id/like", asyncHandler(ctrl.toggleLike));
feedRouter.get("/:id/comments", validate(paginationSchema, "query"), asyncHandler(ctrl.listComments));
feedRouter.post("/:id/comments", validate(commentSchema), asyncHandler(ctrl.addComment));
feedRouter.delete("/:id/comments/:commentId", asyncHandler(ctrl.removeComment));
feedRouter.post("/:id/report", validate(reportSchema), asyncHandler(ctrl.report));
