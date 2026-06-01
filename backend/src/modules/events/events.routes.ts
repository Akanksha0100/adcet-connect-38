import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./events.controller.js";
import {
  eventInputSchema,
  eventUpdateSchema,
  eventListQuery,
  moderationSchema,
  rsvpSchema,
} from "./events.validators.js";

export const eventsRouter = Router();

eventsRouter.get("/", requireAuth, requireApproved, validate(eventListQuery, "query"), asyncHandler(ctrl.list));
eventsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
eventsRouter.get("/:id", requireAuth, requireApproved, asyncHandler(ctrl.getById));
eventsRouter.post("/", requireAuth, requireApproved, validate(eventInputSchema), asyncHandler(ctrl.create));
eventsRouter.patch(
  "/:id",
  requireAuth,
  requireApproved,
  validate(eventUpdateSchema),
  asyncHandler(ctrl.update),
);
eventsRouter.delete("/:id", requireAuth, requireApproved, asyncHandler(ctrl.remove));

eventsRouter.post("/:id/rsvp", requireAuth, requireApproved, validate(rsvpSchema), asyncHandler(ctrl.rsvp));
// RSVP list visible to the organiser or any admin (service enforces).
eventsRouter.get("/:id/rsvps", requireAuth, requireApproved, asyncHandler(ctrl.listRsvps));
eventsRouter.get(
  "/mine/posted",
  requireAuth,
  requireApproved,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.myPosted),
);

eventsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);