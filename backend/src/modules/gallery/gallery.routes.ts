import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./gallery.controller.js";
import {
  addPhotosSchema,
  albumInputSchema,
  albumUpdateSchema,
  listAlbumsQuery,
} from "./gallery.validators.js";

export const galleryRouter = Router();

/* Albums — public read (published only), admin write. `optionalAuth` is what
   lets a signed-in admin also see unpublished albums from the same endpoint. */
galleryRouter.get("/albums", optionalAuth, validate(listAlbumsQuery, "query"), asyncHandler(ctrl.listAlbums));
galleryRouter.post("/albums", requireAuth, requireAdmin, validate(albumInputSchema), asyncHandler(ctrl.createAlbum));
galleryRouter.patch("/albums/:id", requireAuth, requireAdmin, validate(albumUpdateSchema), asyncHandler(ctrl.updateAlbum));
galleryRouter.delete("/albums/:id", requireAuth, requireAdmin, asyncHandler(ctrl.deleteAlbum));

/* Photos — always admin; the bytes are already in storage by this point. */
galleryRouter.post("/albums/:id/photos", requireAuth, requireAdmin, validate(addPhotosSchema), asyncHandler(ctrl.addPhotos));
galleryRouter.delete("/photos/:photoId", requireAuth, requireAdmin, asyncHandler(ctrl.deletePhoto));
