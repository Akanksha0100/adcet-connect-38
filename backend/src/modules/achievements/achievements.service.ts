import { prisma } from "../../lib/prisma.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";

type Caller = { sub: string; roles: AppRoleName[] };
const isAdmin = (c?: Caller) => !!c?.roles.includes("ADMIN");

export const list = async (
  q: PaginationQuery & { q?: string; status?: any; userId?: string },
  caller?: Caller,
) => {
  const where: any = {
    ...(isAdmin(caller) ? { ...(q.status && { status: q.status }) } : { status: q.status ?? "APPROVED" }),
    ...(q.userId && { userId: q.userId }),
    ...(q.q && {
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.achievement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      ...paginate(q),
    }),
    prisma.achievement.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const create = (caller: Caller, data: any) =>
  prisma.achievement.create({ data: { ...data, userId: caller.sub } });

export const update = async (caller: Caller, id: string, data: any) => {
  const existing = await prisma.achievement.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.userId !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return prisma.achievement.update({ where: { id }, data });
};

export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.achievement.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.userId !== caller.sub && !isAdmin(caller)) throw Forbidden();
  await prisma.achievement.delete({ where: { id } });
};

export const moderate = async (
  id: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const achievement = await prisma.achievement.update({
    where: { id },
    data: { status, rejectionReason: status === "REJECTED" ? reason ?? null : null },
  });
  const verb = status === "APPROVED" ? "approved" : "rejected";
  await notify(achievement.userId, {
    type: `achievement.${verb}`,
    title: `Your achievement was ${verb}`,
    body:
      status === "REJECTED"
        ? `"${achievement.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`
        : `"${achievement.title}" is now visible to alumni.`,
    data: { achievementId: achievement.id },
    sendEmailToo: true,
  });
  return achievement;
};

export const listPending = async (q: PaginationQuery) => {
  const where = { status: "PENDING" as const };
  const [items, total] = await Promise.all([
    prisma.achievement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      ...paginate(q),
    }),
    prisma.achievement.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};