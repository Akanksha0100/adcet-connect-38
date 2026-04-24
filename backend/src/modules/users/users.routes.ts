import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./users.controller.js";
import {
  changePasswordSchema,
  updateMeSchema,
  updatePreferencesSchema,
} from "./users.validators.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.patch("/me", validate(updateMeSchema), asyncHandler(ctrl.updateMe));
usersRouter.get("/me/preferences", asyncHandler(ctrl.getPreferences));
usersRouter.put(
  "/me/preferences",
  validate(updatePreferencesSchema),
  asyncHandler(ctrl.updatePreferences),
);
usersRouter.post(
  "/me/change-password",
  validate(changePasswordSchema),
  asyncHandler(ctrl.changePassword),
);