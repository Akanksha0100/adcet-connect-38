import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const newsInputSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  link: z.string().url().optional(),
});
export const newsUpdateSchema = newsInputSchema.partial().extend({
  link: z.string().url().nullable().optional(),
});

export const resourceInputSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  link: z.string().url().optional(),
  category: z.string().max(80).optional(),
});
export const resourceUpdateSchema = resourceInputSchema.partial().extend({
  link: z.string().url().nullable().optional(),
  category: z.string().max(80).nullable().optional(),
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