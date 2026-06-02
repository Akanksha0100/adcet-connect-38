import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./notifications.controller.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", validate(paginationSchema, "query"), asyncHandler(ctrl.list));
notificationsRouter.get("/unread-count", asyncHandler(ctrl.unreadCount));
notificationsRouter.get("/:id", asyncHandler(ctrl.getOne));
notificationsRouter.post("/:id/read", asyncHandler(ctrl.markRead));
notificationsRouter.post("/read-all", asyncHandler(ctrl.markAllRead));