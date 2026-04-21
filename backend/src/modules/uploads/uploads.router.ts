import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getStorage } from "../../storage/index.js";

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  scope: z.enum(["avatar", "event", "achievement", "receipt", "resume"]),
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/presign",
  requireAuth,
  validate(presignSchema),
  asyncHandler(async (req, res) => {
    const result = await getStorage().presignUpload({ ...req.body, ownerId: req.auth!.sub });
    res.json(result);
  }),
);