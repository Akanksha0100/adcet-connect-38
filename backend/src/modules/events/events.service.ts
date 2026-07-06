import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { sendBulkEmails } from "../../lib/mailer.js";
import { eventNotificationEmail, rsvpConfirmationHtml } from "../../lib/email-templates.js";
import { logger } from "../../lib/logger.js";
import jwt from "jsonwebtoken";

type Caller = { sub: string; roles: AppRoleName[] };

const isAdmin = (c: Caller | undefined) => !!c?.roles.includes("ADMIN");

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me-32-chars-min";
const API_BASE_URL = () => process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`;

export const list = async (
  q: PaginationQuery & { q?: string; status?: "PENDING" | "APPROVED" | "REJECTED"; upcoming?: boolean; department?: string },
  caller?: Caller,
) => {
  // Non-admins always see only APPROVED events; admins can filter by status or see all.
  const where: Prisma.EventWhereInput = {
    ...(isAdmin(caller)
      ? q.status ? { status: q.status } : {}
      : { status: "APPROVED" }),
    ...(q.upcoming && { startsAt: { gte: new Date() } }),
    ...(q.department && { department: q.department }),
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
      orderBy: { startsAt: q.upcoming ? "asc" : "desc" },
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

/** Admin-only create: immediately APPROVED. Also sends email notifications. */
export const create = async (
  caller: Caller,
  data: Omit<Prisma.EventUncheckedCreateInput, "createdById" | "status">,
) => {
  const event = await prisma.event.create({
    data: { ...data, createdById: caller.sub, status: "APPROVED" },
  });

  // Fire-and-forget email notifications to targeted alumni
  sendEventNotifications(event).catch((err) =>
    logger.error({ err, eventId: event.id }, "failed to send event notification emails"),
  );

  return event;
};

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

/**
 * Handle email-based RSVP. Validates a signed JWT token and records the response.
 * Returns HTML confirmation page.
 */
export const handleEmailRsvp = async (
  eventId: string,
  token: string,
  response: "YES" | "NO" | "NOT_SURE" | "MAYBE",
): Promise<string> => {
  // Verify signed token
  let payload: { userId: string; eventId: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as typeof payload;
  } catch {
    return rsvpConfirmationHtml("Unknown Event", "Invalid or expired link. Please use the portal.");
  }

  if (payload.eventId !== eventId) {
    return rsvpConfirmationHtml("Unknown Event", "Invalid link.");
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return rsvpConfirmationHtml("Unknown Event", "This event no longer exists.");
  }

  // Map email RSVP to in-app RSVP status
  const rsvpStatusMap: Record<string, "GOING" | "INTERESTED" | "NOT_GOING"> = {
    YES: "GOING",
    MAYBE: "INTERESTED",
    NOT_SURE: "INTERESTED",
    NO: "NOT_GOING",
  };

  const responseLabels: Record<string, string> = {
    YES: "Yes, I'll attend!",
    NO: "No, I can't attend",
    NOT_SURE: "Not Sure",
    MAYBE: "Maybe",
  };

  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId: payload.userId } },
    update: { status: rsvpStatusMap[response], emailRsvpStatus: response },
    create: { eventId, userId: payload.userId, status: rsvpStatusMap[response], emailRsvpStatus: response },
  });

  return rsvpConfirmationHtml(event.title, responseLabels[response]);
};

// ── Internal helpers ────────────────────────────────────────────────────

/**
 * Send email notifications to all alumni in the targeted department (or all
 * alumni if department is null). Each email includes personalised RSVP links.
 */
async function sendEventNotifications(event: {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  isOnline: boolean;
  department: string | null;
  attachmentKey: string | null;
}) {
  // Find alumni to notify
  const whereClause: Prisma.UserWhereInput = {
    status: "APPROVED",
    roles: { some: { role: "ALUMNI" } },
  };

  // If department is specified and not empty, filter by it
  if (event.department && event.department !== "All") {
    whereClause.profile = { department: event.department };
  }

  const alumni = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferences: { select: { notificationsEmail: true } },
    },
  });

  // Filter out those who opted out of email notifications
  const recipients = alumni.filter(
    (a) => !a.preferences || a.preferences.notificationsEmail,
  );

  if (recipients.length === 0) return;

  const emails = recipients.map((recipient) => {
    // Create a signed token for this user's RSVP
    const rsvpToken = jwt.sign(
      { userId: recipient.id, eventId: event.id },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    const baseRsvpUrl = `${API_BASE_URL()}/events/${event.id}/email-rsvp`;

    const rsvpLinks = [
      { label: "Yes ✅", url: `${baseRsvpUrl}?token=${rsvpToken}&response=YES`, style: "success" },
      { label: "Maybe 🤔", url: `${baseRsvpUrl}?token=${rsvpToken}&response=MAYBE`, style: "warning" },
      { label: "Not Sure 🤷", url: `${baseRsvpUrl}?token=${rsvpToken}&response=NOT_SURE`, style: "secondary" },
      { label: "No ❌", url: `${baseRsvpUrl}?token=${rsvpToken}&response=NO`, style: "danger" },
    ];

    const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim() || "Alumni";

    const emailContent = eventNotificationEmail(
      {
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        isOnline: event.isOnline,
        department: event.department,
        eventId: event.id,
        attachmentKey: event.attachmentKey,
      },
      recipientName,
      rsvpLinks,
    );

    return {
      to: recipient.email,
      ...emailContent,
    };
  });

  logger.info(
    { eventId: event.id, recipientCount: emails.length },
    `Sending event notification emails for "${event.title}"`,
  );

  await sendBulkEmails(emails);
}
