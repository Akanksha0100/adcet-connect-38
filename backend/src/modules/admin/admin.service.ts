import { prisma } from "../../lib/prisma.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";

export const listUsers = async (
  q: PaginationQuery & { q?: string; status?: any; role?: AppRoleName },
) => {
  const where: any = {
    ...(q.status && { status: q.status }),
    ...(q.role && { roles: { some: { role: q.role } } }),
    ...(q.q && {
      OR: [
        { firstName: { contains: q.q, mode: "insensitive" } },
        { lastName: { contains: q.q, mode: "insensitive" } },
        { email: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { roles: true, profile: { select: { department: true, graduationYear: true, currentCompany: true, city: true } } },
      ...paginate(q),
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: items.map(({ passwordHash: _ph, ...u }) => u),
    pagination: paginationMeta(total, q),
  };
};

export const setUserStatus = async (
  actorId: string,
  userId: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw NotFound();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status, rejectionReason: status === "REJECTED" ? reason ?? null : null },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: status === "APPROVED" ? "user.approve" : "user.reject",
      entity: "User",
      entityId: userId,
      metadata: reason ? { reason } : undefined,
    },
  });
  // In-app + email notification to the affected user.
  const verb = status === "APPROVED" ? "approved" : "rejected";
  await notify(userId, {
    type: `account.${verb}`,
    title: status === "APPROVED" ? "Your account was approved" : "Your account was rejected",
    body:
      status === "APPROVED"
        ? "Welcome aboard! You now have full access to the alumni portal."
        : `Your account application was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    sendEmailToo: true,
  });
  return { id: updated.id, status: updated.status };
};

export const assignRole = async (userId: string, role: AppRoleName) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw NotFound();
  try {
    return await prisma.userRole.create({ data: { userId, role } });
  } catch {
    throw Conflict("User already has this role");
  }
};

export const revokeRole = async (userId: string, role: AppRoleName) => {
  await prisma.userRole.deleteMany({ where: { userId, role } });
};

export const getAuditLog = async (q: PaginationQuery) => {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, ...paginate(q) }),
    prisma.auditLog.count(),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

/** Generate a simple report — JSON or CSV. */
export const generateReport = async (input: {
  type: "users" | "alumni" | "events" | "jobs" | "donations" | "achievements";
  format: "csv" | "json";
  from?: Date;
  to?: Date;
}) => {
  const range =
    input.from || input.to
      ? { createdAt: { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) } }
      : {};
  const rows = await fetchReportRows(input.type, range);
  if (input.format === "json") return { rows };
  return { csv: toCsv(rows) };
};

const fetchReportRows = async (type: string, where: any): Promise<Record<string, unknown>[]> => {
  switch (type) {
    case "users":
      return (await prisma.user.findMany({ where, select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true } })) as any;
    case "alumni":
      return (await prisma.profile.findMany({
        where: { user: { status: "APPROVED" } },
        select: { userId: true, department: true, graduationYear: true, currentCompany: true, city: true },
      })) as any;
    case "events":
      return (await prisma.event.findMany({ where, select: { id: true, title: true, status: true, startsAt: true, location: true, createdAt: true } })) as any;
    case "jobs":
      return (await prisma.job.findMany({ where, select: { id: true, title: true, company: true, status: true, vacancies: true, createdAt: true } })) as any;
    case "donations":
      return (await prisma.donation.findMany({ where, select: { id: true, userId: true, amount: true, currency: true, status: true, createdAt: true } })) as any;
    case "achievements":
      return (await prisma.achievement.findMany({ where, select: { id: true, title: true, status: true, createdAt: true } })) as any;
    default:
      return [];
  }
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};