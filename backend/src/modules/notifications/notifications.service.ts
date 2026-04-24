import { prisma } from "../../lib/prisma.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";

export const list = async (userId: string, q: PaginationQuery) => {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(q) }),
    prisma.notification.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const markRead = (userId: string, id: string) =>
  prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });

export const markAllRead = (userId: string) =>
  prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });

/** Internal helper used by other modules to dispatch in-app notifications. */
export const create = (userId: string, type: string, title: string, body?: string, data?: any) =>
  prisma.notification.create({ data: { userId, type, title, body, data } });