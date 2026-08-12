import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

/** Accepts an ISO date string and hands the service a `Date`. */
const dateInput = z.coerce.date();

export const newsInputSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  link: z.string().url().optional(),
  tag: z.string().trim().max(40).optional(),
  publishedAt: dateInput.optional(),
});
export const newsUpdateSchema = newsInputSchema.partial().extend({
  link: z.string().url().nullable().optional(),
  tag: z.string().trim().max(40).nullable().optional(),
});

export const newsletterInputSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  fileKey: z.string().min(1).max(500),
  coverKey: z.string().min(1).max(500).optional(),
  publishedAt: dateInput.optional(),
});
export const newsletterUpdateSchema = newsletterInputSchema.partial().extend({
  description: z.string().max(2000).nullable().optional(),
  coverKey: z.string().min(1).max(500).nullable().optional(),
});

export const supportInputSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().max(200).optional(),
  message: z.string().min(2).max(5000),
});

export const sectionUpsertSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
});

export const listQuery = paginationSchema;