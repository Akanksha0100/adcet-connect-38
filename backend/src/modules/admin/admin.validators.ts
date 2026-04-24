import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const userListQuery = paginationSchema.extend({
  q: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  role: z.enum(["ALUMNI", "STUDENT", "ADMIN", "RECRUITER"]).optional(),
});

export const userStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(["ALUMNI", "STUDENT", "ADMIN", "RECRUITER"]),
});

export const reportSchema = z.object({
  type: z.enum(["users", "alumni", "events", "jobs", "donations", "achievements"]),
  format: z.enum(["csv", "json"]).default("json"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});