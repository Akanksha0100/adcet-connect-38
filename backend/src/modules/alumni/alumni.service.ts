import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";

export const search = async (
  q: PaginationQuery & {
    q?: string;
    city?: string;
    company?: string;
    department?: string;
    graduationYear?: number;
    graduationYearMin?: number;
    graduationYearMax?: number;
  },
) => {
  const where: Prisma.ProfileWhereInput = {
    user: { status: "APPROVED" },
    ...(q.city && { city: { contains: q.city, mode: "insensitive" } }),
    ...(q.company && { currentCompany: { contains: q.company, mode: "insensitive" } }),
    ...(q.department && { department: { contains: q.department, mode: "insensitive" } }),
    ...(q.graduationYear && { graduationYear: q.graduationYear }),
    ...((q.graduationYearMin || q.graduationYearMax) && {
      graduationYear: {
        ...(q.graduationYearMin && { gte: q.graduationYearMin }),
        ...(q.graduationYearMax && { lte: q.graduationYearMax }),
      },
    }),
    ...(q.q && {
      OR: [
        { user: { firstName: { contains: q.q, mode: "insensitive" } } },
        { user: { lastName: { contains: q.q, mode: "insensitive" } } },
        { currentCompany: { contains: q.q, mode: "insensitive" } },
        { currentRole: { contains: q.q, mode: "insensitive" } },
      ],
    }),
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