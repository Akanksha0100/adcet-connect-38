/**
 * Pagination utilities — keeps `?page=&pageSize=` semantics consistent across all list endpoints.
 */
import { z } from "zod";
import { PAGINATION } from "../config/constants.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * Parse an optional boolean from a query-string param.
 *
 * `z.coerce.boolean()` is unsafe for query strings: it applies JS `Boolean()`,
 * so the string "false" becomes `true` (every non-empty string is truthy),
 * making `?flag=false` behave like `?flag=true`. This maps "true"/"false"
 * (and "1"/"0") to real booleans and leaves anything else undefined.
 */
export const booleanQueryParam = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}, z.boolean().optional());

export const paginate = (q: PaginationQuery) => ({
  skip: (q.page - 1) * q.pageSize,
  take: q.pageSize,
});

export const paginationMeta = (total: number, q: PaginationQuery) => ({
  total,
  page: q.page,
  pageSize: q.pageSize,
  totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
});