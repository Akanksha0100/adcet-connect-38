import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

/** Filters for the admin insights dashboard (charts + KPIs). */
export const insightsQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  department: z.string().max(120).optional(),
});

/** Alumni filter criteria (shared by the analytics table and bulk email). */
const alumniFilterFields = {
  q: z.string().optional(),
  branch: z.string().optional(),
  department: z.string().optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2100).optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  skill: z.string().optional(),
};

/** Bulk email to the alumni matching a filter set. */
export const bulkEmailSchema = z.object({
  filters: z.object(alumniFilterFields).partial().default({}),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(200_000),
  attachments: z
    .array(
      z.object({
        key: z.string().min(1).max(500),
        filename: z.string().min(1).max(255),
      }),
    )
    .max(10)
    .optional(),
});

export const alumniAnalyticsQuery = paginationSchema.extend({
  q: z.string().optional(),
  branch: z.string().optional(),
  department: z.string().optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2100).optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  skill: z.string().optional(),
});
