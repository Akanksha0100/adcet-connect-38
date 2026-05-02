import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireApproved } from "../../middlewares/requireApproved.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./alumni.controller.js";
import { directoryQuery } from "./alumni.validators.js";

export const alumniRouter = Router();
alumniRouter.get("/", requireAuth, requireApproved, validate(directoryQuery, "query"), asyncHandler(ctrl.search));