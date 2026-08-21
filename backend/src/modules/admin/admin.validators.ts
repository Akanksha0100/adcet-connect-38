import { z } from "zod";
import { ROLE_VALUES } from "../../config/constants.js";
import { SETTING_KEYS } from "../../lib/settings.js";
import { paginationSchema } from "../../lib/pagination.js";

/** A chapter id, or "none" to match users who haven't joined a chapter. */
const chapterFilter = z.union([z.string().uuid(), z.literal("none")]).optional();

export const userListQuery = paginationSchema.extend({
  q: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  chapterId: chapterFilter,
});

export const userStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(ROLE_VALUES),
});

/**
 * `DELETE /admin/users/:id/roles/:role`. The role arrives as a path segment,
 * so it needs validating just like a body would: without this an arbitrary
 * string reached Prisma's enum column and came back as a 500.
 */
export const roleParamSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLE_VALUES),
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
  chapterId: chapterFilter,
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
/**
 * Settings PATCH body. Each key is validated by its own schema in
 * `lib/settings.ts` when applied; here we only insist the payload names at
 * least one known setting, so a typo'd key fails loudly instead of silently
 * doing nothing.
 */
export const settingsUpdateSchema = z
  .object(
    Object.fromEntries(
      SETTING_KEYS.map((key) => [key, z.unknown().optional()]),
    ) as Record<string, z.ZodTypeAny>,
  )
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one setting to update",
  });
