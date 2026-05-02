import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import * as ctrl from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", requireAuth, requireApproved, asyncHandler(ctrl.overview));
analyticsRouter.get("/alumni-by-year", requireAuth, requireApproved, asyncHandler(ctrl.alumniByYear));
analyticsRouter.get("/department-breakdown", requireAuth, requireApproved, asyncHandler(ctrl.departmentBreakdown));
analyticsRouter.get("/admin/overview", requireAuth, requireAdmin, asyncHandler(ctrl.adminOverview));