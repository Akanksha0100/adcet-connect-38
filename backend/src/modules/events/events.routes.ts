import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./events.controller.js";
import { eventInputSchema, eventUpdateSchema, eventListQuery, rsvpSchema, emailRsvpSchema } from "./events.validators.js";

export const eventsRouter = Router();

// List & detail — any approved user
eventsRouter.get("/", requireAuth, requireApproved, validate(eventListQuery, "query"), asyncHandler(ctrl.list));
eventsRouter.get("/:id", requireAuth, requireApproved, asyncHandler(ctrl.getById));

// Create / update / delete — admin only
eventsRouter.post("/", requireAuth, requireAdmin, validate(eventInputSchema), asyncHandler(ctrl.create));
eventsRouter.patch("/:id", requireAuth, requireAdmin, validate(eventUpdateSchema), asyncHandler(ctrl.update));
eventsRouter.delete("/:id", requireAuth, requireAdmin, asyncHandler(ctrl.remove));

// RSVP — any approved user
eventsRouter.post("/:id/rsvp", requireAuth, requireApproved, validate(rsvpSchema), asyncHandler(ctrl.rsvp));

// Email RSVP — public endpoint (token-based auth via signed JWT in query params)
eventsRouter.get("/:id/email-rsvp", validate(emailRsvpSchema, "query"), asyncHandler(ctrl.emailRsvp));

// RSVPs list — admin only
eventsRouter.get("/:id/rsvps", requireAuth, requireAdmin, validate(paginationSchema, "query"), asyncHandler(ctrl.listRsvps));
