import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as ctrl from "./geo.controller.js";

export const geoRouter = Router();
geoRouter.get("/cities", asyncHandler(ctrl.cities));
geoRouter.get("/companies", asyncHandler(ctrl.companies));
geoRouter.get("/breakdown", asyncHandler(ctrl.cityCompanyBreakdown));