import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./alumni.controller.js";
import { directoryQuery } from "./alumni.validators.js";

export const alumniRouter = Router();
alumniRouter.get("/", optionalAuth, validate(directoryQuery, "query"), asyncHandler(ctrl.search));