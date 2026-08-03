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

/** Create a Razorpay order. Amount is in whole rupees. */
export const createOrderSchema = z.object({
  amount: z.coerce.number().int().min(1).max(10_000_000),
  message: z.string().max(1000).optional(),
  isAnonymous: z.boolean().optional(),
  /**
   * Which campaign the money is for. Omitted (or empty) means a general
   * donation to the alumni fund, which stays a valid choice — hence optional
   * rather than required.
   */
  campaignId: z.union([z.string().uuid(), z.literal("")]).optional()
    .transform((v) => (v ? v : undefined)),
});

/** Payload returned by Razorpay Checkout, verified on the backend. */
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
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
