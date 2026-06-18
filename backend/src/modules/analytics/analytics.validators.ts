import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

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
