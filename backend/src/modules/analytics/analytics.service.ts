import { prisma } from "../../lib/prisma.js";

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