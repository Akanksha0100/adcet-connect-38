import { z } from "zod";

export const albumInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  /** Optional: an album may be created before its date is known. */
  eventDate: z.coerce.date().optional(),
  location: z.string().trim().max(120).optional(),
  isPublished: z.boolean().optional(),
});

export const albumUpdateSchema = albumInputSchema.partial().extend({
  eventDate: z.union([z.coerce.date(), z.null()]).optional(),
  location: z.union([z.string().trim().max(120), z.null()]).optional(),
});

/**
 * Photos are added in bulk: the admin picks a batch of files, the browser
 * uploads them all, then posts the resulting keys in one request.
 */
export const addPhotosSchema = z.object({
  imageKeys: z.array(z.string().min(1).max(500)).min(1).max(100),
});

export const listAlbumsQuery = z.object({
  /** Admin-only: include albums that are not published yet. */
  includeUnpublished: z.coerce.boolean().optional(),
});
