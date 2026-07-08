import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./analytics.controller.js";
import { alumniAnalyticsQuery, insightsQuery, bulkEmailSchema } from "./analytics.validators.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", requireAuth, requireApproved, asyncHandler(ctrl.overview));
analyticsRouter.get("/alumni-by-year", requireAuth, requireApproved, asyncHandler(ctrl.alumniByYear));
analyticsRouter.get("/department-breakdown", requireAuth, requireApproved, asyncHandler(ctrl.departmentBreakdown));
analyticsRouter.get("/admin/overview", requireAuth, requireAdmin, asyncHandler(ctrl.adminOverview));
analyticsRouter.get(
  "/admin/alumni",
  requireAuth,
  requireAdmin,
  validate(alumniAnalyticsQuery, "query"),
  asyncHandler(ctrl.alumniList),
);
analyticsRouter.get("/admin/alumni/facets", requireAuth, requireAdmin, asyncHandler(ctrl.alumniFacets));
analyticsRouter.get(
  "/admin/insights",
  requireAuth,
  requireAdmin,
  validate(insightsQuery, "query"),
  asyncHandler(ctrl.insights),
);
analyticsRouter.post(
  "/admin/alumni/email",
  requireAuth,
  requireAdmin,
  validate(bulkEmailSchema),
  asyncHandler(ctrl.bulkEmail),
);
