import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./donations.controller.js";
import {
  campaignInputSchema,
  donationInputSchema,
  donationStatusSchema,
  listCampaignsQuery,
  listDonationsQuery,
} from "./donations.validators.js";

export const donationsRouter = Router();

// Campaigns (public read, admin write)
donationsRouter.get(
  "/campaigns",
  validate(listCampaignsQuery, "query"),
  asyncHandler(ctrl.listCampaigns),
);
donationsRouter.get("/campaigns/:id", asyncHandler(ctrl.getCampaign));
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

// Donations
donationsRouter.post("/", requireAuth, validate(donationInputSchema), asyncHandler(ctrl.pledge));
donationsRouter.get("/me", requireAuth, asyncHandler(ctrl.myDonations));
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