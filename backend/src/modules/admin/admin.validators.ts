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

export const REPORT_TYPES = [
  "users",
  "alumni",
  "pending-approvals",
  "events",
  "event-rsvps",
  "jobs",
  "job-applications",
  "achievements",
  "donations",
  "donations-summary",
] as const;

export const reportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  format: z.enum(["csv", "json"]).default("json"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.string().max(40).optional(),
  department: z.string().max(120).optional(),
});

export const adminMessageSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export const bulkStatusSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

/** Filters for the department-verification export of PENDING users. */
export const approvalExportQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  department: z.string().max(120).optional(),
});

/**
 * Decisions imported back from a department-verified sheet. Each row is
 * matched by userId (preferred) or email, and must carry a YES/NO verdict.
 */
export const approvalImportSchema = z.object({
  decisions: z
    .array(
      z
        .object({
          userId: z.string().uuid().optional(),
          email: z.string().email().optional(),
          decision: z.enum(["YES", "NO"]),
        })
        .refine((d) => d.userId || d.email, { message: "Each decision needs a userId or email" }),
    )
    .min(1)
    .max(5000),
  reason: z.string().max(1000).optional(),
});