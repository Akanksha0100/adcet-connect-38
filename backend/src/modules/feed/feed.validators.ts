import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { FEED_MEDIA } from "../../config/constants.js";

const mediaItemSchema = z.object({
  key: z.string().min(1).max(500),
  type: z.enum(["IMAGE", "VIDEO"]),
  mimeType: z.string().max(100).optional(),
});

/**
 * A post needs *something* — text, media, or both — and media is capped at
 * either 2 images or 1 video (never a mix, matching the composer UI).
 */
const mediaRules = (media: z.infer<typeof mediaItemSchema>[]) => {
  const images = media.filter((m) => m.type === "IMAGE").length;
  const videos = media.filter((m) => m.type === "VIDEO").length;
  if (images && videos) return "A post can contain images or a video, not both";
  if (images > FEED_MEDIA.MAX_IMAGES) return `At most ${FEED_MEDIA.MAX_IMAGES} images per post`;
  if (videos > FEED_MEDIA.MAX_VIDEOS) return `At most ${FEED_MEDIA.MAX_VIDEOS} video per post`;
  return null;
};

export const createPostSchema = z
  .object({
    // Treat a whitespace-only body from the composer as "no text".
    content: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().max(5000).optional(),
    ),
    media: z.array(mediaItemSchema).max(FEED_MEDIA.MAX_IMAGES).default([]),
  })
  .superRefine((d, ctx) => {
    if (!d.content && d.media.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "Write something or attach media" });
    }
    const err = mediaRules(d.media);
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["media"], message: err });
  });

/** Edits change the text only — swapping media after publish is not supported. */
export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const listQuerySchema = paginationSchema.extend({
  authorId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const reportsQuerySchema = paginationSchema.extend({
  status: z.enum(["OPEN", "ACTIONED", "DISMISSED"]).optional(),
});

export const reportResolveSchema = z.object({
  status: z.enum(["ACTIONED", "DISMISSED"]),
});
