import { prisma } from "../../lib/prisma.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";

type Caller = { sub: string; roles: AppRoleName[] };

const isAdmin = (c: Caller | undefined) => !!c?.roles.includes("ADMIN");

export const list = async (
  q: PaginationQuery & { q?: string; status?: "PENDING" | "APPROVED" | "REJECTED"; upcoming?: boolean },
  caller?: Caller,
) => {
  // Non-admins can never see PENDING/REJECTED unless they own them.
  const status = q.status ?? "APPROVED";
  const where: any = {
    ...(isAdmin(caller) ? { ...(q.status && { status: q.status }) } : { status }),
    ...(q.upcoming && { startsAt: { gte: new Date() } }),
    ...(q.q && {
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { rsvps: true } } },
      ...paginate(q),
    }),
    prisma.event.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const getById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { rsvps: true } } },
  });
  if (!event) throw NotFound("Event not found");
  return event;
};

export const create = (caller: Caller, data: any) =>
  prisma.event.create({ data: { ...data, createdById: caller.sub } });

export const update = async (caller: Caller, id: string, data: any) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return prisma.event.update({ where: { id }, data });
};

export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  await prisma.event.delete({ where: { id } });
};

export const moderate = async (
  id: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const event = await prisma.event.update({
    where: { id },
    data: { status, rejectionReason: status === "REJECTED" ? reason ?? null : null },
  });
  const verb = status === "APPROVED" ? "approved" : "rejected";
  await notify(event.createdById, {
    type: `event.${verb}`,
    title: `Your event was ${verb}`,
    body:
      status === "REJECTED"
        ? `"${event.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`
        : `"${event.title}" is now live.`,
    data: { eventId: event.id },
    sendEmailToo: true,
  });
  return event;
};

export const rsvp = (eventId: string, userId: string, status: "GOING" | "INTERESTED" | "NOT_GOING") =>
  prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status },
    create: { eventId, userId, status },
  });

export const listRsvps = (eventId: string) =>
  prisma.eventRsvp.findMany({
    where: { eventId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

export const listPending = async (q: PaginationQuery) => {
  const where = { status: "PENDING" as const };
  const [items, total] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(q) }),
    prisma.event.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};