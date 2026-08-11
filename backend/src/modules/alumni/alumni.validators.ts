import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

/**
 * Query strings carry no arrays, so multi-select filters arrive comma-separated
 * (`departments=Civil Engineering,Food Technology`). Values are matched exactly
 * against what is stored, and an unknown one simply narrows the result set —
 * the same lenient posture the other read filters take.
 */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(item))
    .optional();

export const directoryQuery = paginationSchema.extend({
  q: z.string().optional(),
  city: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  departments: csv(z.string()),
  graduationYear: z.coerce.number().int().optional(),
  graduationYears: csv(z.coerce.number().int()),
  graduationYearMin: z.coerce.number().int().optional(),
  graduationYearMax: z.coerce.number().int().optional(),
});