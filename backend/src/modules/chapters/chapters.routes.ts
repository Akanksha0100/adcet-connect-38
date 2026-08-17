import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin, requireRoles } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as ctrl from "./chapters.controller.js";
import {
  chapterListQuery,
  createChapterSchema,
  emailRespondSchema,
  inviteSchema,
  respondSchema,
  updateChapterSchema,
} from "./chapters.validators.js";

export const chaptersRouter = Router();

// Public — the landing page lists the chapters for logged-out visitors.
// `optionalAuth` only matters so admins can pass ?includeInactive=true.
chaptersRouter.get("/", optionalAuth, validate(chapterListQuery, "query"), asyncHandler(ctrl.list));

// Public one-click accept/decline from the invitation email (signed JWT in the
// query string, no session) — mirrors the event email-RSVP endpoint.
chaptersRouter.get(
  "/invitations/email-respond",
  validate(emailRespondSchema, "query"),
  asyncHandler(ctrl.emailRespond),
);

// Literal paths must precede "/:slug" so they aren't matched as a slug.
chaptersRouter.get("/me", requireAuth, asyncHandler(ctrl.getMine));
chaptersRouter.get("/invitations/me", requireAuth, asyncHandler(ctrl.myInvitations));

// Membership is invite-only — there is deliberately no self-service join.
// An alumnus can only accept or decline an invitation an admin sent them.
chaptersRouter.post(
  "/invitations/:invitationId/respond",
  requireAuth,
  requireRoles("ALUMNI"),
  requireApproved,
  validate(respondSchema),
  asyncHandler(ctrl.respondToInvitation),
);

// ── Admin ────────────────────────────────────────────────────────────────
chaptersRouter.post("/", requireAuth, requireAdmin, validate(createChapterSchema), asyncHandler(ctrl.create));
chaptersRouter.patch("/:id", requireAuth, requireAdmin, validate(updateChapterSchema), asyncHandler(ctrl.update));
// Delete only succeeds for an empty chapter; the service returns 409 otherwise
// and points the admin at archiving instead.
chaptersRouter.delete("/:id", requireAuth, requireAdmin, asyncHandler(ctrl.remove));

// Readable by any approved member, not just admins — the portal has a
// read-only Chapters page where alumni browse a chapter's roster. Writes below
// stay admin-only, and the controller withholds email addresses from
// non-admins, so this grants visibility and nothing else.
chaptersRouter.get(
  "/:id/members",
  requireAuth,
  requireApproved,
  validate(paginationSchema, "query"),
  asyncHandler(ctrl.listMembers),
);
chaptersRouter.delete("/:id/members/:userId", requireAuth, requireAdmin, asyncHandler(ctrl.removeMember));

chaptersRouter.get("/:id/invitations", requireAuth, requireAdmin, asyncHandler(ctrl.listInvitations));
chaptersRouter.post(
  "/:id/invitations",
  requireAuth,
  requireAdmin,
  validate(inviteSchema),
  asyncHandler(ctrl.invite),
);
chaptersRouter.delete(
  "/invitations/:invitationId",
  requireAuth,
  requireAdmin,
  asyncHandler(ctrl.cancelInvitation),
);

chaptersRouter.get("/:slug", asyncHandler(ctrl.getBySlug));
