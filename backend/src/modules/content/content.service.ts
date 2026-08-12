import { prisma } from "../../lib/prisma.js";
import { NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import { sendEmail } from "../../lib/mailer.js";

/* ----------------------------- News ----------------------------- */
export const listNews = async (q: PaginationQuery) => {
  const [items, total] = await Promise.all([
    prisma.newsItem.findMany({ orderBy: { publishedAt: "desc" }, ...paginate(q) }),
    prisma.newsItem.count(),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};
export const createNews = (data: {
  title: string;
  body: string;
  link?: string;
  tag?: string;
  publishedAt?: Date;
}) => prisma.newsItem.create({ data });
export const updateNews = async (
  id: string,
  data: {
    title?: string;
    body?: string;
    link?: string | null;
    tag?: string | null;
    publishedAt?: Date;
  },
) => {
  const existing = await prisma.newsItem.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  return prisma.newsItem.update({ where: { id }, data });
};
export const deleteNews = async (id: string) => {
  await prisma.newsItem.delete({ where: { id } }).catch(() => undefined);
};

/* ----------------------------- Newsletters ----------------------------- */
export const listNewsletters = async (q: PaginationQuery) => {
  const [items, total] = await Promise.all([
    prisma.newsletter.findMany({ orderBy: { publishedAt: "desc" }, ...paginate(q) }),
    prisma.newsletter.count(),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};
export const createNewsletter = (data: {
  title: string;
  description?: string;
  fileKey: string;
  coverKey?: string;
  publishedAt?: Date;
}) => prisma.newsletter.create({ data });
export const updateNewsletter = async (
  id: string,
  data: {
    title?: string;
    description?: string | null;
    fileKey?: string;
    coverKey?: string | null;
    publishedAt?: Date;
  },
) => {
  const existing = await prisma.newsletter.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  return prisma.newsletter.update({ where: { id }, data });
};
export const deleteNewsletter = async (id: string) => {
  await prisma.newsletter.delete({ where: { id } }).catch(() => undefined);
};

/* ----------------------------- Support inbox ----------------------------- */
export const listSupport = async (q: PaginationQuery) => {
  const [items, total] = await Promise.all([
    prisma.supportMessage.findMany({ orderBy: { createdAt: "desc" }, ...paginate(q) }),
    prisma.supportMessage.count(),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};
export const submitSupport = async (data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  userId?: string;
}) => {
  const msg = await prisma.supportMessage.create({ data });
  // Soft notify ops via console-mailer.
  try {
    await sendEmail({
      to: "alumni@adcet.in",
      subject: `[Support] ${msg.subject ?? "New message"} from ${msg.name}`,
      text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`,
    });
  } catch {
    /* non-fatal */
  }
  return msg;
};
export const resolveSupport = async (id: string, resolved: boolean) => {
  const existing = await prisma.supportMessage.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  return prisma.supportMessage.update({
    where: { id },
    data: { resolvedAt: resolved ? new Date() : null },
  });
};
export const deleteSupport = async (id: string) => {
  await prisma.supportMessage.delete({ where: { id } }).catch(() => undefined);
};

/* ----------------------------- Site sections (about/contact/etc) ----------------------------- */
export const listSections = () => prisma.siteSection.findMany();
export const getSection = (key: string) => prisma.siteSection.findUnique({ where: { key } });
export const upsertSection = (key: string, data: { title: string; body: string }) =>
  prisma.siteSection.upsert({ where: { key }, update: data, create: { key, ...data } });