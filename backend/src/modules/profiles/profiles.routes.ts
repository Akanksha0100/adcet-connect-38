import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./profiles.controller.js";
import {
  educationSchema,
  experienceSchema,
  skillsSchema,
  updateProfileSchema,
  preferencesSchema,
} from "./profiles.validators.js";

export const profilesRouter = Router();

profilesRouter.get("/me", requireAuth, asyncHandler(ctrl.me));
profilesRouter.patch("/me", requireAuth, validate(updateProfileSchema), asyncHandler(ctrl.updateMe));
profilesRouter.get("/:userId", requireAuth, requireApproved, asyncHandler(ctrl.byUserId));

profilesRouter.post(
  "/me/experiences",
  requireAuth,
  validate(experienceSchema),
  asyncHandler(ctrl.addExperience),
);
profilesRouter.delete("/me/experiences/:id", requireAuth, asyncHandler(ctrl.removeExperience));

profilesRouter.post(
  "/me/educations",
  requireAuth,
  validate(educationSchema),
  asyncHandler(ctrl.addEducation),
);
profilesRouter.delete("/me/educations/:id", requireAuth, asyncHandler(ctrl.removeEducation));

profilesRouter.put("/me/skills", requireAuth, validate(skillsSchema), asyncHandler(ctrl.setSkills));

// Preferences (theme, notifications)
profilesRouter.get("/me/preferences", requireAuth, asyncHandler(ctrl.getPreferences));
profilesRouter.patch("/me/preferences", requireAuth, validate(preferencesSchema), asyncHandler(ctrl.updatePreferences));