import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./content.controller.js";
import {
  listQuery,
  newsInputSchema,
  newsUpdateSchema,
  newsletterInputSchema,
  newsletterUpdateSchema,
  sectionUpsertSchema,
  supportInputSchema,
} from "./content.validators.js";

export const contentRouter = Router();

/* News — public read, admin write */
contentRouter.get("/news", validate(listQuery, "query"), asyncHandler(ctrl.listNews));
contentRouter.post("/news", requireAuth, requireAdmin, validate(newsInputSchema), asyncHandler(ctrl.createNews));
contentRouter.patch("/news/:id", requireAuth, requireAdmin, validate(newsUpdateSchema), asyncHandler(ctrl.updateNews));
contentRouter.delete("/news/:id", requireAuth, requireAdmin, asyncHandler(ctrl.deleteNews));

/* Newsletters — public read, admin write */
contentRouter.get("/newsletters", validate(listQuery, "query"), asyncHandler(ctrl.listNewsletters));
contentRouter.post("/newsletters", requireAuth, requireAdmin, validate(newsletterInputSchema), asyncHandler(ctrl.createNewsletter));
contentRouter.patch("/newsletters/:id", requireAuth, requireAdmin, validate(newsletterUpdateSchema), asyncHandler(ctrl.updateNewsletter));
contentRouter.delete("/newsletters/:id", requireAuth, requireAdmin, asyncHandler(ctrl.deleteNewsletter));

/* Support — public submit, admin manage */
contentRouter.post("/support", optionalAuth, validate(supportInputSchema), asyncHandler(ctrl.submitSupport));
contentRouter.get("/support", requireAuth, requireAdmin, validate(listQuery, "query"), asyncHandler(ctrl.listSupport));
contentRouter.patch("/support/:id", requireAuth, requireAdmin, asyncHandler(ctrl.resolveSupport));
contentRouter.delete("/support/:id", requireAuth, requireAdmin, asyncHandler(ctrl.deleteSupport));

/* Site sections — public read, admin write */
contentRouter.get("/sections", asyncHandler(ctrl.listSections));
contentRouter.get("/sections/:key", asyncHandler(ctrl.getSection));
contentRouter.put("/sections/:key", requireAuth, requireAdmin, validate(sectionUpsertSchema), asyncHandler(ctrl.upsertSection));