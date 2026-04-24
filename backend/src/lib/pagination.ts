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