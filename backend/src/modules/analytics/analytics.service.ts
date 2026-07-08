import { prisma } from "../../lib/prisma.js";
import { Prisma, DegreeType } from "@prisma/client";
import { paginationMeta } from "../../lib/pagination.js";
import { sendBulkEmails } from "../../lib/mailer.js";
import { wrapHtmlEmail } from "../../lib/email-templates.js";
import { getStorage } from "../../storage/index.js";

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
export type AlumniFilter = {
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
};

/**
 * Build the Prisma where-clause for approved-alumni filtering. Shared by the
 * analytics table and the bulk-email recipient resolver so both target the
 * exact same set.
 */
export const buildAlumniWhere = (q: AlumniFilter): Prisma.ProfileWhereInput => {
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
  return {
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
};

export const alumniList = async (q: AlumniFilter & { page?: number; pageSize?: number }) => {
  const where = buildAlumniWhere(q);
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

/* -------------------------------------------------------------------------- */
/*  Admin insights dashboard — KPIs, monthly trends, and distributions.       */
/*  Filterable by date range + department. Admins are excluded everywhere.    */
/* -------------------------------------------------------------------------- */

const NOT_ADMIN = { roles: { none: { role: "ADMIN" as const } } };
const monthKey = (d: Date | string) => new Date(d).toISOString().slice(0, 7); // YYYY-MM

/** Bucket a set of dates into a sorted monthly count series. */
const trendByMonth = (dates: (Date | string)[]): { month: string; count: number }[] => {
  const m = new Map<string, number>();
  for (const d of dates) m.set(monthKey(d), (m.get(monthKey(d)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([month, count]) => ({ month, count }));
};

const countByStatus = (arr: { status: string }[]) => {
  const m = new Map<string, number>();
  for (const x of arr) m.set(x.status, (m.get(x.status) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value }));
};

export const adminInsights = async (f: { from?: Date; to?: Date; department?: string }) => {
  const range = f.from || f.to ? { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) } : undefined;
  const created = range ? { createdAt: range } : {};
  const dept = f.department;
  const alumniWhere: Prisma.ProfileWhereInput = {
    user: { status: "APPROVED", ...NOT_ADMIN },
    ...(dept && { department: dept }),
  };

  const [users, events, jobs, donations, achievements, totalAlumni, byDepartment, byYear, topCompanies, topCities] =
    await Promise.all([
      prisma.user.findMany({
        where: { ...created, ...NOT_ADMIN, ...(dept && { profile: { department: dept } }) },
        select: { createdAt: true, status: true },
      }),
      prisma.event.findMany({
        where: { ...created, ...(dept && { department: dept }) },
        select: { createdAt: true, status: true, _count: { select: { rsvps: true } } },
      }),
      prisma.job.findMany({
        where: { ...created, ...(dept && { department: dept }) },
        select: { createdAt: true, status: true, isClosed: true },
      }),
      prisma.donation.findMany({
        where: { ...created },
        select: { createdAt: true, paidAt: true, amount: true, status: true },
      }),
      prisma.achievement.findMany({ where: { ...created }, select: { createdAt: true, status: true } }),
      prisma.profile.count({ where: alumniWhere }),
      prisma.profile.groupBy({
        by: ["department"],
        where: { user: { status: "APPROVED", ...NOT_ADMIN }, department: { not: null } },
        _count: { _all: true },
      }),
      prisma.profile.groupBy({
        by: ["graduationYear"],
        where: { ...alumniWhere, graduationYear: { not: null } },
        _count: { _all: true },
        orderBy: { graduationYear: "asc" },
      }),
      prisma.profile.groupBy({
        by: ["currentCompany"],
        where: { ...alumniWhere, currentCompany: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { currentCompany: "desc" } },
        take: 10,
      }),
      prisma.profile.groupBy({
        by: ["city"],
        where: { ...alumniWhere, city: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 10,
      }),
    ]);

  const receivedDonations = donations.filter((d) => d.status === "RECEIVED");
  const donationTrendMap = new Map<string, { count: number; amount: number }>();
  for (const d of receivedDonations) {
    const key = monthKey(d.paidAt ?? d.createdAt);
    const cur = donationTrendMap.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += d.amount;
    donationTrendMap.set(key, cur);
  }

  return {
    kpis: {
      totalAlumni,
      newRegistrations: users.length,
      newUsersApproved: users.filter((u) => u.status === "APPROVED").length,
      events: events.length,
      totalRsvps: events.reduce((s, e) => s + e._count.rsvps, 0),
      jobs: jobs.length,
      openJobs: jobs.filter((j) => !j.isClosed).length,
      achievements: achievements.length,
      donationsReceived: receivedDonations.length,
      donationAmount: receivedDonations.reduce((s, d) => s + d.amount, 0),
    },
    trends: {
      registrations: trendByMonth(users.map((u) => u.createdAt)),
      events: trendByMonth(events.map((e) => e.createdAt)),
      jobs: trendByMonth(jobs.map((j) => j.createdAt)),
      achievements: trendByMonth(achievements.map((a) => a.createdAt)),
      donations: [...donationTrendMap.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([month, v]) => ({ month, count: v.count, amount: v.amount })),
    },
    distributions: {
      byDepartment: byDepartment
        .map((d) => ({ label: d.department ?? "—", value: d._count._all }))
        .sort((a, b) => b.value - a.value),
      byGraduationYear: byYear.map((y) => ({ label: String(y.graduationYear), value: y._count._all })),
      donationStatus: countByStatus(donations),
      jobStatus: countByStatus(jobs),
      eventStatus: countByStatus(events),
      topCompanies: topCompanies.map((c) => ({ label: c.currentCompany ?? "—", value: c._count._all })),
      topCities: topCities.map((c) => ({ label: c.city ?? "—", value: c._count._all })),
    },
  };
};

/* -------------------------------------------------------------------------- */
/*  Bulk email to filtered alumni.                                            */
/* -------------------------------------------------------------------------- */

const MAX_BULK_RECIPIENTS = 5000;
const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const personalize = (
  str: string,
  r: { firstName: string; lastName: string; email: string },
) =>
  str
    .replaceAll("{{name}}", `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim())
    .replaceAll("{{firstName}}", r.firstName ?? "")
    .replaceAll("{{email}}", r.email);

/** Count the alumni that match a filter set (drives the composer's preview). */
export const countAlumniRecipients = (filters: AlumniFilter) =>
  prisma.profile.count({ where: buildAlumniWhere(filters) });

/**
 * Send a branded HTML email (with optional attachments) to every approved
 * alumnus matching the given filters. Body/subject support `{{name}}`,
 * `{{firstName}}` and `{{email}}` placeholders for personalization.
 */
export const sendAlumniBulkEmail = async (
  actorId: string,
  input: {
    filters: AlumniFilter;
    subject: string;
    html: string;
    attachments?: { key: string; filename: string }[];
  },
) => {
  const profiles = await prisma.profile.findMany({
    where: buildAlumniWhere(input.filters),
    select: { user: { select: { email: true, firstName: true, lastName: true } } },
    take: MAX_BULK_RECIPIENTS,
  });
  const recipients = profiles
    .map((p) => p.user)
    .filter((u): u is { email: string; firstName: string; lastName: string } => !!u?.email);

  if (recipients.length === 0) return { recipientCount: 0, sent: 0, failed: 0 };

  // Resolve attachment object keys to URLs the mailer can attach.
  const storage = getStorage();
  const attachments = input.attachments?.length
    ? await Promise.all(
        input.attachments.map(async (a) => ({
          filename: a.filename,
          path: await storage.presignDownload(a.key),
        })),
      )
    : undefined;

  const mails = recipients.map((r) => {
    const bodyHtml = personalize(input.html, r);
    const subject = personalize(input.subject, r);
    return {
      to: r.email,
      subject,
      text: stripHtml(bodyHtml),
      html: wrapHtmlEmail(subject, bodyHtml),
      attachments,
    };
  });

  const { sent, failed } = await sendBulkEmails(mails);

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "alumni.bulk_email",
      entity: "Alumni",
      metadata: {
        subject: input.subject,
        recipientCount: recipients.length,
        sent,
        failed,
        filters: input.filters as unknown as Prisma.InputJsonValue,
      },
    },
  });

  return { recipientCount: recipients.length, sent, failed };
};
