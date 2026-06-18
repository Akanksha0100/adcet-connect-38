import { prisma } from "../../lib/prisma.js";
import { Prisma, DegreeType } from "@prisma/client";
import { paginationMeta } from "../../lib/pagination.js";

/** Aggregate counts feeding the public analytics dashboard. */
export const overview = async () => {
  const [users, alumni, events, jobs, achievements, donations] = await Promise.all([
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.userRole.count({ where: { role: "ALUMNI", user: { status: "APPROVED" } } }),
    prisma.event.count({ where: { status: "APPROVED" } }),
    prisma.job.count({ where: { status: "APPROVED" } }),
    prisma.achievement.count({ where: { status: "APPROVED" } }),
    prisma.donation.aggregate({ where: { status: "RECEIVED" }, _sum: { amount: true }, _count: true }),
  ]);
  return {
    totalUsers: users,
    totalAlumni: alumni,
    totalEvents: events,
    totalJobs: jobs,
    totalAchievements: achievements,
    totalDonationsAmount: donations._sum.amount ?? 0,
    totalDonationsCount: donations._count,
  };
};

/** Alumni count grouped by graduation year — line chart on dashboard. */
export const alumniByYear = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["graduationYear"],
    where: { graduationYear: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.graduationYear)
    .map((g) => ({ year: g.graduationYear, count: g._count._all }))
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
};

export const departmentBreakdown = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["department"],
    where: { department: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped.map((g) => ({ department: g.department, count: g._count._all }));
};

/** Admin-only — unfiltered moderation pipeline counters. */
export const adminOverview = async () => {
  const [pendingUsers, pendingEvents, pendingJobs, pendingAchievements] = await Promise.all([
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.job.count({ where: { status: "PENDING" } }),
    prisma.achievement.count({ where: { status: "PENDING" } }),
  ]);
  return { pendingUsers, pendingEvents, pendingJobs, pendingAchievements };
};

/** Admin-only — filterable alumni list for analytics. */
export const alumniList = async (q: {
  q?: string;
  branch?: string;
  department?: string;
  graduationYear?: number;
  degree?: DegreeType;
  city?: string;
  country?: string;
  location?: string;
  currentCompany?: string;
  company?: string;
  currentRole?: string;
  skill?: string;
  page?: number;
  pageSize?: number;
}) => {
  const company = q.company ?? q.currentCompany;
  const branch = q.branch ?? q.department;
  const location = q.location;
  const and: Prisma.ProfileWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { user: { firstName: { contains: q.q, mode: "insensitive" } } },
        { user: { lastName: { contains: q.q, mode: "insensitive" } } },
        { user: { email: { contains: q.q, mode: "insensitive" } } },
        { currentCompany: { contains: q.q, mode: "insensitive" } },
        { currentRole: { contains: q.q, mode: "insensitive" } },
        { department: { contains: q.q, mode: "insensitive" } },
        { city: { contains: q.q, mode: "insensitive" } },
      ],
    });
  }
  if (company) {
    and.push({
      OR: [
        { currentCompany: { contains: company, mode: "insensitive" } },
        { experiences: { some: { company: { contains: company, mode: "insensitive" } } } },
      ],
    });
  }
  if (location) {
    and.push({
      OR: [
        { city: { contains: location, mode: "insensitive" } },
        { country: { contains: location, mode: "insensitive" } },
        { experiences: { some: { location: { contains: location, mode: "insensitive" } } } },
      ],
    });
  }
  const where: Prisma.ProfileWhereInput = {
    user: { status: "APPROVED", roles: { some: { role: "ALUMNI" } } },
    ...(and.length && { AND: and }),
    ...(branch && { department: { contains: branch, mode: "insensitive" } }),
    ...(q.graduationYear && { graduationYear: q.graduationYear }),
    ...(q.degree && { degree: q.degree }),
    ...(q.city && { city: { contains: q.city, mode: "insensitive" } }),
    ...(q.country && { country: { contains: q.country, mode: "insensitive" } }),
    ...(q.currentRole && { currentRole: { contains: q.currentRole, mode: "insensitive" } }),
    ...(q.skill && {
      skills: { some: { skill: { name: { contains: q.skill, mode: "insensitive" } } } },
    }),
  };
  const page = q.page ?? 1;
  const pageSize = Math.min(q.pageSize ?? 100, 500);
  const [items, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        userId: true,
        department: true,
        graduationYear: true,
        city: true,
        country: true,
        degree: true,
        admissionYear: true,
        currentCompany: true,
        currentRole: true,
        phone: true,
        linkedinUrl: true,
        skills: { select: { skill: { select: { name: true } } } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ graduationYear: "desc" }, { user: { lastName: "asc" } }],
    }),
    prisma.profile.count({ where }),
  ]);
  return {
    items: items.map((item) => ({
      ...item,
      skills: item.skills.map((s) => s.skill.name),
    })),
    pagination: paginationMeta(total, { page, pageSize }),
  };
};

export const alumniFacets = async () => {
  const baseWhere: Prisma.ProfileWhereInput = {
    user: { status: "APPROVED", roles: { some: { role: "ALUMNI" } } },
  };
  const [departments, companies, cities, years, degrees] = await Promise.all([
    prisma.profile.groupBy({
      by: ["department"],
      where: { ...baseWhere, department: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { department: "desc" } },
      take: 20,
    }),
    prisma.profile.groupBy({
      by: ["currentCompany"],
      where: { ...baseWhere, currentCompany: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { currentCompany: "desc" } },
      take: 20,
    }),
    prisma.profile.groupBy({
      by: ["city"],
      where: { ...baseWhere, city: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 20,
    }),
    prisma.profile.groupBy({
      by: ["graduationYear"],
      where: { ...baseWhere, graduationYear: { not: null } },
      _count: { _all: true },
      orderBy: { graduationYear: "desc" },
      take: 30,
    }),
    prisma.profile.groupBy({
      by: ["degree"],
      where: { ...baseWhere, degree: { not: null } },
      _count: { _all: true },
    }),
  ]);
  return {
    departments: departments.map((d) => ({ value: d.department, count: d._count._all })),
    companies: companies.map((c) => ({ value: c.currentCompany, count: c._count._all })),
    cities: cities.map((c) => ({ value: c.city, count: c._count._all })),
    years: years.map((y) => ({ value: y.graduationYear, count: y._count._all })),
    degrees: degrees.map((d) => ({ value: d.degree, count: d._count._all })),
  };
};
