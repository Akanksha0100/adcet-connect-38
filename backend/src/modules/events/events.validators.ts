import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

const eventBase = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(20000),
  location: z.string().max(200).optional(),
  isOnline: z.boolean().optional().default(false),
  meetingUrl: z.string().url().max(500).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  coverKey: z.string().optional(),
});

const requireMeetingUrlWhenOnline = (d: {
  isOnline?: boolean;
  meetingUrl?: string;
}) => !d.isOnline || !!d.meetingUrl;

export const eventInputSchema = eventBase.refine(requireMeetingUrlWhenOnline, {
  message: "meetingUrl is required for online events",
  path: ["meetingUrl"],
});

/** Partial schema used for PATCH; re-applies the same refinement. */
export const eventUpdateSchema = eventBase
  .partial()
  .refine(requireMeetingUrlWhenOnline, {
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