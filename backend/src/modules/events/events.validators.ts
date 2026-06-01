import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const eventInputSchema = z
  .object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(20000),
  location: z.string().max(200).optional(),
  isOnline: z.boolean().optional().default(false),
  meetingUrl: z.string().url().max(500).optional().or(z.literal("")).transform(v => v || undefined),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  coverKey: z.string().optional(),
})
  .refine((d) => !d.isOnline || !!d.meetingUrl, {
    message: "meetingUrl is required for online events",
    path: ["meetingUrl"],
  });

export const eventListQuery = paginationSchema.extend({
  q: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  upcoming: z.coerce.boolean().optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(["GOING", "INTERESTED", "NOT_GOING"]),
});

export const moderationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});