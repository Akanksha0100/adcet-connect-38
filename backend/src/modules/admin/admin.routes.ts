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
  adminMessageSchema,
  bulkStatusSchema,
} from "./admin.validators.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", validate(userListQuery, "query"), asyncHandler(ctrl.listUsers));

// bulk-status must be before :id routes to avoid matching "bulk-status" as :id
adminRouter.post(
  "/users/bulk-status",
  validate(bulkStatusSchema),
  asyncHandler(ctrl.bulkSetUserStatus),
);

adminRouter.get("/users/:id", asyncHandler(ctrl.getUser));
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
adminRouter.post(
  "/users/:id/message",
  validate(adminMessageSchema),
  asyncHandler(ctrl.messageUser),
);

adminRouter.get("/audit-log", validate(paginationSchema, "query"), asyncHandler(ctrl.auditLog));
adminRouter.post("/reports", validate(reportSchema), asyncHandler(ctrl.generateReport));