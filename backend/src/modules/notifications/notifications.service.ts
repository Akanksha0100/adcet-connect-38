import { prisma } from "../../lib/prisma.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import { sendEmail } from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";

export const list = async (userId: string, q: PaginationQuery) => {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(q) }),
    prisma.notification.count({ where }),
  ]);
  const unread = await prisma.notification.count({ where: { userId, readAt: null } });
  return { items, pagination: paginationMeta(total, q), unread };
};

export const unreadCount = async (userId: string) => {
  const unread = await prisma.notification.count({ where: { userId, readAt: null } });
  return { unread };
};

export const markRead = (userId: string, id: string) =>
  prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });

export const markAllRead = (userId: string) =>
  prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });

/** Internal helper used by other modules to dispatch in-app notifications. */
export const create = (
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>,
) =>
  prisma.notification.create({
    data: { userId, type, title, body, data: data as unknown as object | undefined },
  });

/**
 * Dispatch an in-app notification AND send an email if the user opted-in.
 * Best-effort: failures are logged but never thrown so the calling
 * moderation flow always succeeds.
 */
export const notify = async (
  userId: string,
  args: { type: string; title: string; body?: string; data?: Record<string, unknown>; sendEmailToo?: boolean },
) => {
  try {
    await create(userId, args.type, args.title, args.body, args.data);
  } catch (e) {
    logger.error({ err: e, userId }, "failed to insert notification");
  }
  if (!args.sendEmailToo) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    if (!user) return;
    if (prefs && !prefs.notificationsEmail) return; // user opted out
    await sendEmail({ to: user.email, subject: args.title, text: args.body ?? args.title });
  } catch (e) {
    logger.error({ err: e, userId }, "failed to send notification email");
  }
};