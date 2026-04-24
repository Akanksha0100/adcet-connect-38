import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const directoryQuery = paginationSchema.extend({
  q: z.string().optional(),
  city: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  graduationYear: z.coerce.number().int().optional(),
  graduationYearMin: z.coerce.number().int().optional(),
  graduationYearMax: z.coerce.number().int().optional(),
});