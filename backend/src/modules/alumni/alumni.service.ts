import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";

/**
 * Free-text directory search covers **name and company only** — department and
 * graduation year are deliberately excluded so they can't be typed at; those
 * two are filters, not search terms.
 *
 * Each whitespace-separated word must match something, which is what makes a
 * full name work: "asha kulkarni" needs "asha" and "kulkarni" to hit, though
 * either may land on the first name, the last name or the employer.
 */
const nameAndCompanyMatch = (term: string): Prisma.ProfileWhereInput[] =>
  term
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => ({
      OR: [
        { user: { firstName: { contains: word, mode: "insensitive" } } },
        { user: { lastName: { contains: word, mode: "insensitive" } } },
        { currentCompany: { contains: word, mode: "insensitive" } },
      ],
    }));

export const search = async (
  q: PaginationQuery & {
    q?: string;
    city?: string;
    company?: string;
    department?: string;
    departments?: string[];
    graduationYear?: number;
    graduationYears?: number[];
    graduationYearMin?: number;
    graduationYearMax?: number;
  },
) => {
  const where: Prisma.ProfileWhereInput = {
    user: { status: "APPROVED" },
    ...(q.city && { city: { contains: q.city, mode: "insensitive" } }),
    ...(q.company && { currentCompany: { contains: q.company, mode: "insensitive" } }),
    ...(q.department && { department: { contains: q.department, mode: "insensitive" } }),
    // Multi-select filters: within a filter the values OR together.
    ...(q.departments?.length && { department: { in: q.departments } }),
    ...(q.graduationYear && { graduationYear: q.graduationYear }),
    ...(q.graduationYears?.length && { graduationYear: { in: q.graduationYears } }),
    ...((q.graduationYearMin || q.graduationYearMax) && {
      graduationYear: {
        ...(q.graduationYearMin && { gte: q.graduationYearMin }),
        ...(q.graduationYearMax && { lte: q.graduationYearMax }),
      },
    }),
    ...(q.q?.trim() && { AND: nameAndCompanyMatch(q.q) }),
  };
  const [items, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { graduationYear: "desc" },
      ...paginate(q),
    }),
    prisma.profile.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};