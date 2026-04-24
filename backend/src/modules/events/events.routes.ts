import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./events.controller.js";
import {
  eventInputSchema,
  eventListQuery,
  moderationSchema,
  rsvpSchema,
} from "./events.validators.js";

export const eventsRouter = Router();

eventsRouter.get("/", optionalAuth, validate(eventListQuery, "query"), asyncHandler(ctrl.list));
eventsRouter.get(
  "/pending",
  requireAuth,
  requireAdmin,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listPending),
);
eventsRouter.get("/:id", optionalAuth, asyncHandler(ctrl.getById));
eventsRouter.post("/", requireAuth, validate(eventInputSchema), asyncHandler(ctrl.create));
eventsRouter.patch(
  "/:id",
  requireAuth,
  validate(eventInputSchema.partial()),
  asyncHandler(ctrl.update),
);
eventsRouter.delete("/:id", requireAuth, asyncHandler(ctrl.remove));

eventsRouter.post("/:id/rsvp", requireAuth, validate(rsvpSchema), asyncHandler(ctrl.rsvp));
eventsRouter.get("/:id/rsvps", requireAuth, requireAdmin, asyncHandler(ctrl.listRsvps));

eventsRouter.post(
  "/:id/moderate",
  requireAuth,
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);