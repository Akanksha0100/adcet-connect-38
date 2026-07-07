import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "../../lib/pagination.js";

export const jobInputSchema = z.object({
  title: z.string().min(2).max(200),
  company: z.string().min(1).max(160),
  location: z.string().max(200).optional(),
  isRemote: z.boolean().optional().default(false),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  experienceMin: z.coerce.number().int().min(0).optional(),
  experienceMax: z.coerce.number().int().min(0).optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
  currency: z.string().max(8).optional(),
  description: z.string().min(10).max(20000),
  attachmentKey: z.string().optional(),
  department: z.string().max(100).optional(),
  requirements: z.string().max(20000).optional(),
  vacancies: z.coerce.number().int().min(1).default(1),
  applyUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const jobListQuery = paginationSchema.extend({
  q: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  isRemote: booleanQueryParam,
  closed: booleanQueryParam,
  department: z.string().optional(),
});

export const applySchema = z.object({
  resumeKey: z.string().min(1, "Resume is required"),
  coverLetter: z.string().max(5000).optional(),
});

export const moderationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

export const closeSchema = z.object({
  closed: z.boolean(),
});