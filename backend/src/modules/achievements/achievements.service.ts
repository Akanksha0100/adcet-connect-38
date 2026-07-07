import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";
import { sendEmail, sendBulkEmails } from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";
import {
  achievementApprovedEmail,
  achievementAnnouncementEmail,
} from "../../lib/email-templates.js";

type Caller = { sub: string; roles: AppRoleName[] };
const isAdmin = (c?: Caller) => !!c?.roles.includes("ADMIN");

/** SiteSection key that stores the newline/comma-separated authority recipient emails. */
export const ACHIEVEMENT_RECIPIENTS_KEY = "achievement_recipients";

/** Read + parse the configured "higher authority" notification emails. */
const getAuthorityRecipients = async (): Promise<string[]> => {
  const section = await prisma.siteSection.findUnique({
    where: { key: ACHIEVEMENT_RECIPIENTS_KEY },
  });
  if (!section?.body) return [];
  return Array.from(
    new Set(
      section.body
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  );
};

type AchievementStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AchievementInput = Omit<Prisma.AchievementUncheckedCreateInput, "userId">;

export const list = async (
  q: PaginationQuery & { q?: string; status?: AchievementStatus; userId?: string },
  caller?: Caller,
) => {
  const where: Prisma.AchievementWhereInput = {
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

export const create = (caller: Caller, data: AchievementInput) =>
  prisma.achievement.create({ data: { ...data, userId: caller.sub } });

export const getById = async (id: string) => {
  const item = await prisma.achievement.findUnique({
    where: { id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!item) throw NotFound();
  return item;
};

export const update = async (caller: Caller, id: string, data: Prisma.AchievementUpdateInput) => {
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
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  const verb = status === "APPROVED" ? "approved" : "rejected";
  const authorName = `${achievement.user.firstName ?? ""} ${achievement.user.lastName ?? ""}`.trim() || "Alumnus";

  // In-app notification for the author (always).
  await notify(achievement.userId, {
    type: `achievement.${verb}`,
    title: `Your achievement was ${verb}`,
    body:
      status === "REJECTED"
        ? `"${achievement.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`
        : `"${achievement.title}" is now visible to alumni.`,
    data: { achievementId: achievement.id },
    // Rejections rely on the generic notification email; approvals send a
    // richer branded email below, so avoid double-emailing the author.
    sendEmailToo: status === "REJECTED",
  });

  // On approval, send branded emails to the author and college authorities.
  if (status === "APPROVED") {
    const emailData = {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      occurredOn: achievement.occurredOn,
      link: achievement.link,
    };
    try {
      const authorMail = achievementApprovedEmail(emailData, authorName);
      await sendEmail({
        to: achievement.user.email,
        subject: authorMail.subject,
        text: authorMail.text,
        html: authorMail.html,
      });
    } catch (e) {
      logger.error({ err: e, id }, "failed to email achievement author on approval");
    }
    try {
      const recipients = await getAuthorityRecipients();
      if (recipients.length) {
        const announce = achievementAnnouncementEmail(emailData, authorName);
        await sendBulkEmails(
          recipients.map((to) => ({
            to,
            subject: announce.subject,
            text: announce.text,
            html: announce.html,
          })),
        );
      }
    } catch (e) {
      logger.error({ err: e, id }, "failed to email authorities on achievement approval");
    }
  }

  return achievement;
};

/**
 * Public feed of the latest approved achievements — powers the home-page
 * slider. No auth required; only APPROVED rows and safe fields are exposed.
 */
export const listFeatured = async (limit = 8) =>
  prisma.achievement.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 20),
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      occurredOn: true,
      imageKey: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

/**
 * Public single-achievement view (for the shareable /achievements/:id page).
 * Returns only APPROVED achievements — pending/rejected 404 for the public.
 */
export const getPublicById = async (id: string) => {
  const item = await prisma.achievement.findFirst({
    where: { id, status: "APPROVED" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      occurredOn: true,
      imageKey: true,
      attachmentKey: true,
      link: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!item) throw NotFound();
  return item;
};

export const listPending = async (q: PaginationQuery) => {
  const where = { status: "PENDING" as const };
  const [items, total] = await Promise.all([
    prisma.achievement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      ...paginate(q),
    }),
    prisma.achievement.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};