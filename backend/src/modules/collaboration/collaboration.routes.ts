import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./collaboration.controller.js";
import {
  collaborationInputSchema,
  listQuerySchema,
  moderationSchema,
} from "./collaboration.validators.js";

export const collaborationRouter = Router();

// Nothing here is public: a collaboration request is a private conversation
// between one alumnus and the alumni office, at every status.
collaborationRouter.use(requireAuth, requireApproved);

/** Admin sidebar badges. Declared before "/:id" so it isn't shadowed by it. */
collaborationRouter.get("/pending-counts", requireAdmin, asyncHandler(ctrl.pendingCounts));

collaborationRouter.get("/", validate(listQuerySchema, "query"), asyncHandler(ctrl.list));
collaborationRouter.get("/:id", asyncHandler(ctrl.getById));
collaborationRouter.post("/", validate(collaborationInputSchema), asyncHandler(ctrl.create));
collaborationRouter.delete("/:id", asyncHandler(ctrl.remove));
collaborationRouter.post(
  "/:id/moderate",
  requireAdmin,
  validate(moderationSchema),
  asyncHandler(ctrl.moderate),
);
