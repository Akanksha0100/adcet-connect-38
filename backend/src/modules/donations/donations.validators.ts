import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "../../lib/pagination.js";

export const campaignInputSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(20000),
  goalAmount: z.coerce.number().int().min(1),
  currency: z.string().max(8).optional(),
  coverKey: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const donationInputSchema = z.object({
  campaignId: z.string().uuid().optional(),
  amount: z.coerce.number().int().min(1),
  currency: z.string().max(8).optional(),
  message: z.string().max(1000).optional(),
  proofKey: z.string().min(1).max(500).optional(),
  isAnonymous: z.boolean().optional(),
});

export const donationStatusSchema = z.object({
  status: z.enum(["PLEDGED", "RECEIVED", "CANCELLED"]),
  receiptKey: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export const listCampaignsQuery = paginationSchema.extend({
  active: booleanQueryParam,
});

export const listDonationsQuery = paginationSchema.extend({
  campaignId: z.string().uuid().optional(),
  status: z.enum(["PLEDGED", "RECEIVED", "CANCELLED"]).optional(),
});
