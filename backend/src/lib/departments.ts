/**
 * Shared Zod pieces for department-typed fields.
 *
 * Every module that *writes* a department (sign-up, profile update, event, job)
 * must use `departmentSchema` so only names from `DEPARTMENTS` can ever reach
 * the database. Query filters use `departmentFilterSchema` instead: it is
 * deliberately lenient so a stale bookmark or an unmigrated legacy value
 * narrows the result set to nothing rather than failing the whole request
 * with a 400.
 */
import { z } from "zod";
import { DEPARTMENTS } from "../config/constants.js";

const DEPARTMENT_VALUES = DEPARTMENTS as unknown as [string, ...string[]];

/** Writable department — must be one of the official names. */
export const departmentSchema = z.enum(DEPARTMENT_VALUES, {
  errorMap: () => ({ message: "Select a valid department" }),
});

/** Writable and optional; empty string is treated as "not provided". */
export const optionalDepartmentSchema = z
  .union([departmentSchema, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Read-side filter — accepts anything, matches only what exists. */
export const departmentFilterSchema = z.string().max(120).optional();

/**
 * Targeting list for events and job posts, which can aim at any number of
 * departments. **An empty list means every department** — same meaning the old
 * nullable `department` column gave to NULL.
 *
 * Duplicates are collapsed so the stored array is a true set; the legacy "All"
 * sentinel the old event form submitted is dropped rather than rejected, since
 * it always meant "no filter".
 */
export const departmentListSchema = z
  .array(z.union([departmentSchema, z.literal("All")]))
  .max(DEPARTMENTS.length)
  .optional()
  .default([])
  .transform((list) => [...new Set(list.filter((d) => d !== "All"))] as string[]);
