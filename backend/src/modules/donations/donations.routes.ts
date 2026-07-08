import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./donations.controller.js";
import {
  campaignInputSchema,
  createOrderSchema,
  verifyPaymentSchema,
  donationStatusSchema,
  listCampaignsQuery,
  listDonationsQuery,
} from "./donations.validators.js";

export const donationsRouter = Router();

// Razorpay webhook — PUBLIC (no auth). Razorpay signs the payload; we verify
// the HMAC signature in the service. Must be declared before auth-gated routes.
donationsRouter.post("/webhook", asyncHandler(ctrl.webhook));

// Campaigns (public read, admin write)
donationsRouter.get(
  "/campaigns",
  requireAuth,
  requireApproved,
  validate(listCampaignsQuery, "query"),
  asyncHandler(ctrl.listCampaigns),
);
donationsRouter.get("/campaigns/:id", requireAuth, requireApproved, asyncHandler(ctrl.getCampaign));
donationsRouter.post(
  "/campaigns",
  requireAuth,
  requireAdmin,
  validate(campaignInputSchema),
  asyncHandler(ctrl.createCampaign),
);
donationsRouter.patch(
  "/campaigns/:id",
  requireAuth,
  requireAdmin,
  validate(campaignInputSchema.partial()),
  asyncHandler(ctrl.updateCampaign),
);
donationsRouter.delete(
  "/campaigns/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(ctrl.deleteCampaign),
);

// Donations — Razorpay payment flow (create order → pay → verify)
donationsRouter.post(
  "/order",
  requireAuth,
  requireApproved,
  validate(createOrderSchema),
  asyncHandler(ctrl.createOrder),
);
donationsRouter.post(
  "/verify",
  requireAuth,
  requireApproved,
  validate(verifyPaymentSchema),
  asyncHandler(ctrl.verifyPayment),
);
donationsRouter.get("/me", requireAuth, requireApproved, asyncHandler(ctrl.myDonations));
donationsRouter.get(
  "/",
  requireAuth,
  requireAdmin,
  validate(listDonationsQuery, "query"),
  asyncHandler(ctrl.listDonations),
);
donationsRouter.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  validate(donationStatusSchema),
  asyncHandler(ctrl.updateDonationStatus),
);