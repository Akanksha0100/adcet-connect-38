import { z } from "zod";

/** Slugs are used in public URLs, so keep them lowercase and URL-safe. */
const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only");

export const chapterListQuery = z.object({
  /** Admins only — include archived chapters in the response. */
  includeInactive: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export const createChapterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.optional(),
  city: z.string().trim().max(120).optional(),
  blurb: z.string().trim().max(2000).optional(),
  accent: z.string().trim().max(200).optional(),
});

/**
 * Chapters are never deleted — `isActive: false` archives one instead, which
 * hides it from the public page and the join picker without touching members.
 */
export const updateChapterSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    city: z.union([z.string().trim().max(120), z.null()]).optional(),
    blurb: z.union([z.string().trim().max(2000), z.null()]).optional(),
    accent: z.union([z.string().trim().max(200), z.null()]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

/** Admin invites an alumnus to a chapter. Membership needs their consent. */
export const inviteSchema = z.object({
  userId: z.string().uuid(),
  message: z.string().trim().max(1000).optional(),
});

/** The invitee's answer, from the portal. */
export const respondSchema = z.object({
  response: z.enum(["ACCEPT", "DECLINE"]),
});

/** The invitee's answer, from a signed one-click link in the email. */
export const emailRespondSchema = z.object({
  token: z.string().min(1),
  response: z.enum(["ACCEPT", "DECLINE"]),
});
