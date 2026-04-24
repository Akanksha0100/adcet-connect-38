import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./admin.controller.js";
import {
  assignRoleSchema,
  reportSchema,
  userListQuery,
  userStatusSchema,
} from "./admin.validators.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", validate(userListQuery, "query"), asyncHandler(ctrl.listUsers));
adminRouter.post(
  "/users/:id/status",
  validate(userStatusSchema),
  asyncHandler(ctrl.setUserStatus),
);
adminRouter.post(
  "/users/:id/roles",
  validate(assignRoleSchema),
  asyncHandler(ctrl.assignRole),
);
adminRouter.delete("/users/:id/roles/:role", asyncHandler(ctrl.revokeRole));

adminRouter.get("/audit-log", validate(paginationSchema, "query"), asyncHandler(ctrl.auditLog));
adminRouter.post("/reports", validate(reportSchema), asyncHandler(ctrl.generateReport));