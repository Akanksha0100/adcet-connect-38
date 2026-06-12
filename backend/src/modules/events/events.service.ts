import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";

type Caller = { sub: string; roles: AppRoleName[] };

const isAdmin = (c: Caller | undefined) => !!c?.roles.includes("ADMIN");

export const list = async (
  q: PaginationQuery & { q?: string; status?: "PENDING" | "APPROVED" | "REJECTED"; upcoming?: boolean },
  caller?: Caller,
) => {
  // Non-admins always see only APPROVED events; admins can filter by status or see all.
  const where: Prisma.EventWhereInput = {
    ...(isAdmin(caller)
      ? q.status ? { status: q.status } : {}
      : { status: "APPROVED" }),
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
      include: {
        _count: { select: { rsvps: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      ...paginate(q),
    }),
    prisma.event.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const getById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { rsvps: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!event) throw NotFound("Event not found");
  return event;
};

/** Admin-only create: immediately APPROVED. */
export const create = (caller: Caller, data: Omit<Prisma.EventUncheckedCreateInput, "createdById" | "status">) =>
  prisma.event.create({ data: { ...data, createdById: caller.sub, status: "APPROVED" } });

export const update = async (caller: Caller, id: string, data: Prisma.EventUpdateInput) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (!isAdmin(caller)) throw Forbidden();
  return prisma.event.update({ where: { id }, data });
};

export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (!isAdmin(caller)) throw Forbidden();
  await prisma.event.delete({ where: { id } });
};

export const rsvp = (eventId: string, userId: string, status: "GOING" | "INTERESTED" | "NOT_GOING") =>
  prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status },
    create: { eventId, userId, status },
  });

export const listRsvps = async (caller: Caller, eventId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFound();
  if (!isAdmin(caller)) throw Forbidden();
  return prisma.eventRsvp.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profile: { select: { phone: true, city: true, currentCompany: true, graduationYear: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};
