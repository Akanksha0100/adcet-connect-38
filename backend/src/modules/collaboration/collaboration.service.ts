/**
 * Alumni Collaboration — alumni offer to run a placement drive or a workshop,
 * an admin approves or rejects, and the office takes it from there.
 *
 * Deliberately a *request board*, not a scheduler: approving creates no event,
 * job post or calendar entry. The whole point is to make the query reachable —
 * the follow-up happens off-platform on the contact details captured here.
 */
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";
import { sendEmail } from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";
import {
  collaborationDecisionEmail,
  type CollaborationEmailData,
} from "../../lib/email-templates.js";
import type {
  CollaborationInput,
  CollaborationListQuery,
  CollaborationTypeName,
} from "./collaboration.validators.js";

type Caller = { sub: string; roles: AppRoleName[] };
const isAdmin = (c?: Caller) => !!c?.roles.includes("ADMIN");

const requesterSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  profile: { select: { department: true, graduationYear: true, currentCompany: true } },
} as const;

/**
 * A request is readable by its author and by any admin — and by nobody else.
 * Unlike achievements there is no "published" state: an approved placement
 * drive is a private arrangement between one alumnus and the office, not
 * community content, so approval never widens the audience.
 */
export const list = async (q: CollaborationListQuery, caller: Caller) => {
  const filters: Prisma.CollaborationRequestWhereInput[] = [];

  if (isAdmin(caller) && !q.mine) {
    if (q.status) filters.push({ status: q.status });
  } else {
    filters.push({ userId: caller.sub });
    if (q.status) filters.push({ status: q.status });
  }
  if (q.type) filters.push({ type: q.type });
  if (q.q) {
    filters.push({
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { organization: { contains: q.q, mode: "insensitive" } },
        { subject: { contains: q.q, mode: "insensitive" } },
        { jobRole: { contains: q.q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.CollaborationRequestWhereInput = filters.length ? { AND: filters } : {};
  const [items, total] = await Promise.all([
    prisma.collaborationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: requesterSelect } },
      ...paginate(q),
    }),
    prisma.collaborationRequest.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const getById = async (caller: Caller, id: string) => {
  const item = await prisma.collaborationRequest.findUnique({
    where: { id },
    include: { user: { select: requesterSelect } },
  });
  if (!item) throw NotFound("Request not found");
  if (item.userId !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return item;
};

export const create = (caller: Caller, data: CollaborationInput) => {
  // The validator's discriminated union narrows to one of two shapes; widening
  // it here is what lets both spread into the single row Prisma expects.
  const row: Prisma.CollaborationRequestUncheckedCreateInput = { ...data, userId: caller.sub };
  return prisma.collaborationRequest.create({
    data: row,
    include: { user: { select: requesterSelect } },
  });
};

/**
 * Withdraw a request. Only the author, and only while it is still PENDING —
 * once the office has decided, the decision is part of their record and
 * deleting it would erase the reason the alumnus was told. Admins may remove
 * any request (spam clean-up).
 */
export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.collaborationRequest.findUnique({ where: { id } });
  if (!existing) throw NotFound("Request not found");
  if (!isAdmin(caller)) {
    if (existing.userId !== caller.sub) throw Forbidden();
    if (existing.status !== "PENDING") {
      throw Forbidden("Only a pending request can be withdrawn");
    }
  }
  await prisma.collaborationRequest.delete({ where: { id } });
};

/** Counters for the admin sidebar badges, one per collaboration type. */
export const pendingCounts = async (): Promise<Record<CollaborationTypeName, number>> => {
  const grouped = await prisma.collaborationRequest.groupBy({
    by: ["type"],
    where: { status: "PENDING" },
    _count: { _all: true },
  });
  const counts = { PLACEMENT: 0, WORKSHOP: 0 } as Record<CollaborationTypeName, number>;
  for (const row of grouped) counts[row.type as CollaborationTypeName] = row._count._all;
  return counts;
};

const dateText = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const MODE_LABEL: Record<string, string> = {
  ON_CAMPUS: "On campus",
  ONLINE: "Online",
  HYBRID: "Hybrid",
};

/** The type-specific rows an email should show, in reading order. */
const emailRows = (r: Prisma.CollaborationRequestGetPayload<object>) => {
  const rows: { label: string; value: string }[] = [];
  if (r.type === "PLACEMENT") {
    if (r.jobRole) rows.push({ label: "Role", value: r.jobRole });
    if (r.candidatesRequired != null)
      rows.push({ label: "Candidates required", value: String(r.candidatesRequired) });
    if (r.packageLpa != null) rows.push({ label: "Package", value: `${r.packageLpa} LPA` });
    if (r.driveDate) rows.push({ label: "Preferred date", value: dateText(r.driveDate) });
    if (r.eligibility) rows.push({ label: "Eligibility", value: r.eligibility });
  } else {
    if (r.subject) rows.push({ label: "Subject", value: r.subject });
    if (r.durationValue != null && r.durationUnit)
      rows.push({
        label: "Duration",
        value: `${r.durationValue} ${r.durationUnit.toLowerCase()}`,
      });
    if (r.startDate)
      rows.push({
        label: "Dates",
        value: r.endDate ? `${dateText(r.startDate)} → ${dateText(r.endDate)}` : dateText(r.startDate),
      });
    if (r.expectedParticipants != null)
      rows.push({ label: "Expected participants", value: String(r.expectedParticipants) });
  }
  if (r.mode) rows.push({ label: "Mode", value: MODE_LABEL[r.mode] ?? r.mode });
  return rows;
};

const KIND_LABEL: Record<CollaborationTypeName, string> = {
  PLACEMENT: "placement drive",
  WORKSHOP: "workshop",
};

/**
 * Admin decision. The alumnus always gets an in-app notification; the branded
 * email carries the same decision (and the rejection reason) to their inbox,
 * and a failure to send must not undo the decision — hence the try/catch.
 */
export const moderate = async (
  adminId: string,
  id: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const existing = await prisma.collaborationRequest.findUnique({ where: { id } });
  if (!existing) throw NotFound("Request not found");

  const req = await prisma.collaborationRequest.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? reason ?? null : null,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
    include: { user: { select: requesterSelect } },
  });

  const kind = KIND_LABEL[req.type as CollaborationTypeName];
  const authorName =
    `${req.user.firstName ?? ""} ${req.user.lastName ?? ""}`.trim() || "Alumnus";

  await notify(req.userId, {
    type: `collaboration.${status.toLowerCase()}`,
    title:
      status === "APPROVED"
        ? `Your ${kind} request was approved`
        : `Your ${kind} request was not approved`,
    body:
      status === "APPROVED"
        ? `"${req.title}" was approved. The alumni office will contact you to work out the details.`
        : `"${req.title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
    data: { collaborationId: req.id, collaborationType: req.type },
    // The branded email below says the same thing — don't double-send.
    sendEmailToo: false,
  });

  try {
    const emailData: CollaborationEmailData = {
      id: req.id,
      type: req.type as CollaborationEmailData["type"],
      title: req.title,
      organization: req.organization,
      departments: req.departments,
      rows: emailRows(req),
    };
    const mail = collaborationDecisionEmail(emailData, authorName, status, reason);
    await sendEmail({
      to: req.user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (e) {
    logger.error({ err: e, id }, "failed to email collaboration decision");
  }

  return req;
};
