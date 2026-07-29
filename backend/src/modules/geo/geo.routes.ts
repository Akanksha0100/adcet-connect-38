import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import * as ctrl from "./geo.controller.js";

export const geoRouter = Router();

// Public — mounted before the auth guard so the landing-page alumni map can
// render for visitors. Returns aggregated city headcounts only.
geoRouter.get("/public/cities", asyncHandler(ctrl.publicCities));

geoRouter.use(requireAuth, requireApproved);
geoRouter.get("/cities", asyncHandler(ctrl.cities));
geoRouter.get("/companies", asyncHandler(ctrl.companies));
geoRouter.get("/breakdown", asyncHandler(ctrl.cityCompanyBreakdown));