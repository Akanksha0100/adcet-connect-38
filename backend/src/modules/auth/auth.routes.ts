import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { authLimiter } from "../../middlewares/rateLimit.js";
import * as ctrl from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sendRegistrationOtpSchema,
} from "./auth.validators.js";

export const authRouter = Router();

authRouter.post("/register/send-otp", authLimiter, validate(sendRegistrationOtpSchema), asyncHandler(ctrl.sendRegistrationOtp));
authRouter.post("/register", authLimiter, validate(registerSchema), asyncHandler(ctrl.register));
authRouter.post("/login", authLimiter, validate(loginSchema), asyncHandler(ctrl.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(ctrl.refresh));
authRouter.post("/logout", validate(refreshSchema), asyncHandler(ctrl.logout));
authRouter.get("/me", requireAuth, asyncHandler(ctrl.me));

authRouter.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), asyncHandler(ctrl.forgotPassword));
authRouter.post("/reset-password", authLimiter, validate(resetPasswordSchema), asyncHandler(ctrl.resetPassword));
authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), asyncHandler(ctrl.changePassword));

// OAuth (stubbed)
authRouter.get("/oauth/:provider", asyncHandler(ctrl.oauthStart));
authRouter.get("/oauth/:provider/callback", asyncHandler(ctrl.oauthCallback));