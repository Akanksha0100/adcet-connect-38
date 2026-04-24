import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const achievementInputSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(10000),
  category: z.string().max(80).optional(),
  occurredOn: z.coerce.date().optional(),
  imageKey: z.string().optional(),
});

export const listQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  userId: z.string().uuid().optional(),
});

export const moderationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});