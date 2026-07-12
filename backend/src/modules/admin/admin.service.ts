import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Conflict, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";

type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export const listUsers = async (
  q: PaginationQuery & { q?: string; status?: UserStatus; role?: AppRoleName },
) => {
  const where: Prisma.UserWhereInput = {
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

/**
 * Bulk approve/reject multiple users in a single operation.
 * Each user gets an audit log entry and notification.
 */
export const bulkSetUserStatus = async (
  actorId: string,
  userIds: string[],
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const results: { id: string; status: string }[] = [];
  const errors: { id: string; error: string }[] = [];

  // Process each user (not a single transaction so partial success is possible)
  for (const userId of userIds) {
    try {
      const result = await setUserStatus(actorId, userId, status, reason);
      results.push(result);
    } catch (e: any) {
      errors.push({ id: userId, error: e?.message ?? "Unknown error" });
    }
  }

  return { updated: results, errors, total: userIds.length };
};

/**
 * Fetch a single user with profile + roles for the admin detail view.
 * Strips passwordHash before returning.
 */
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: true, profile: true },
  });
  if (!user) throw NotFound();
  const { passwordHash: _ph, ...safe } = user;
  return safe;
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

/* -------------------------------------------------------------------------- */
/*  Department-verification bulk approval: export PENDING users to a sheet,   */
/*  departments mark each row YES/NO, and the import applies the decisions.   */
/* -------------------------------------------------------------------------- */

const APPROVAL_EXPORT_CAP = 10_000;

export const exportPendingApprovals = async (f: {
  from?: Date;
  to?: Date;
  department?: string;
}) => {
  const users = await prisma.user.findMany({
    where: {
      status: "PENDING",
      roles: { none: { role: "ADMIN" } },
      ...(f.department && { profile: { department: f.department } }),
      ...((f.from || f.to) && {
        createdAt: { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) },
      }),
    },
    orderBy: { createdAt: "asc" },
    take: APPROVAL_EXPORT_CAP,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      profile: {
        select: { department: true, degree: true, graduationYear: true, linkedinUrl: true },
      },
    },
  });
  return users.map((u) => ({
    userId: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    department: u.profile?.department ?? "",
    degree: u.profile?.degree ?? "",
    graduationYear: u.profile?.graduationYear ?? "",
    linkedinUrl: u.profile?.linkedinUrl ?? "",
    registeredOn: u.createdAt.toISOString().slice(0, 10),
  }));
};

export interface ApprovalDecision {
  userId?: string;
  email?: string;
  decision: "YES" | "NO";
}

/**
 * Apply department verdicts. Only PENDING users are touched; everything else
 * is reported back as skipped so the admin can see exactly what happened.
 * Reuses setUserStatus so every change is audit-logged and the user notified.
 */
export const importApprovalDecisions = async (
  actorId: string,
  decisions: ApprovalDecision[],
  reason?: string,
) => {
  const ids = decisions.map((d) => d.userId).filter((v): v is string => !!v);
  const emails = decisions.map((d) => d.email).filter((v): v is string => !!v);
  const users = await prisma.user.findMany({
    where: { OR: [...(ids.length ? [{ id: { in: ids } }] : []), ...(emails.length ? [{ email: { in: emails } }] : [])] },
    select: { id: true, email: true, status: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  let approved = 0;
  let rejected = 0;
  const skipped: { identifier: string; reason: string }[] = [];
  const processed = new Set<string>();

  for (const d of decisions) {
    const identifier = d.userId ?? d.email ?? "?";
    const user = (d.userId && byId.get(d.userId)) || (d.email && byEmail.get(d.email.toLowerCase())) || null;
    if (!user) {
      skipped.push({ identifier, reason: "User not found" });
      continue;
    }
    if (processed.has(user.id)) {
      skipped.push({ identifier, reason: "Duplicate row" });
      continue;
    }
    processed.add(user.id);
    if (user.status !== "PENDING") {
      skipped.push({ identifier, reason: `Already ${user.status.toLowerCase()}` });
      continue;
    }
    try {
      if (d.decision === "YES") {
        await setUserStatus(actorId, user.id, "APPROVED");
        approved += 1;
      } else {
        await setUserStatus(actorId, user.id, "REJECTED", reason ?? "Not verified by the department");
        rejected += 1;
      }
    } catch (e: any) {
      skipped.push({ identifier, reason: e?.message ?? "Update failed" });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "user.approval_import",
      entity: "User",
      metadata: { approved, rejected, skipped: skipped.length, total: decisions.length },
    },
  });

  return { total: decisions.length, approved, rejected, skipped };
};

/* -------------------------------------------------------------------------- */
/*  Recent activity feed for the admin dashboard.                             */
/*  Merges the latest records across the platform into one readable stream.   */
/* -------------------------------------------------------------------------- */

export interface ActivityItem {
  id: string;
  category: "user" | "event" | "job" | "achievement" | "donation" | "moderation";
  title: string;
  subtitle: string;
  at: Date;
}

const AUDIT_LABELS: Record<string, string> = {
  "user.approve": "Approved a user account",
  "user.reject": "Rejected a user account",
  "user.approval_import": "Imported department verification sheet",
  "alumni.bulk_email": "Sent an email to alumni",
};

export const recentActivity = async (limit = 12): Promise<ActivityItem[]> => {
  const nm = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
    u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
  const notAdmin = { roles: { none: { role: "ADMIN" as const } } };

  const [users, events, jobs, achievements, donations, audits] = await Promise.all([
    prisma.user.findMany({
      where: notAdmin,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
    }),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, createdAt: true, createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, company: true, status: true, createdAt: true },
    }),
    prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.donation.findMany({
      where: { status: "RECEIVED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, amount: true, donorName: true, paidAt: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const items: ActivityItem[] = [];
  for (const u of users)
    items.push({ id: `user-${u.id}`, category: "user", title: nm(u) || "New member", subtitle: `New registration · ${u.status.toLowerCase()}`, at: u.createdAt });
  for (const e of events)
    items.push({ id: `event-${e.id}`, category: "event", title: e.title, subtitle: `Event created${nm(e.createdBy) ? ` by ${nm(e.createdBy)}` : ""} · ${e.status.toLowerCase()}`, at: e.createdAt });
  for (const j of jobs)
    items.push({ id: `job-${j.id}`, category: "job", title: j.title, subtitle: `Job at ${j.company} · ${j.status.toLowerCase()}`, at: j.createdAt });
  for (const a of achievements)
    items.push({ id: `ach-${a.id}`, category: "achievement", title: a.title, subtitle: `Achievement${nm(a.user) ? ` by ${nm(a.user)}` : ""} · ${a.status.toLowerCase()}`, at: a.createdAt });
  for (const d of donations)
    items.push({ id: `don-${d.id}`, category: "donation", title: `₹${d.amount.toLocaleString("en-IN")} donation`, subtitle: `from ${d.donorName || nm(d.user) || "a donor"}`, at: d.paidAt ?? d.createdAt });
  for (const au of audits) {
    const meta = (au.metadata ?? {}) as Record<string, unknown>;
    let subtitle = "";
    if (au.action === "alumni.bulk_email") {
      subtitle = `${meta.subject ? `"${meta.subject}" · ` : ""}${(meta.recipientCount as number) ?? 0} recipients`;
    } else if (au.action === "user.approval_import") {
      subtitle = `${(meta.approved as number) ?? 0} approved · ${(meta.rejected as number) ?? 0} rejected · ${(meta.skipped as number) ?? 0} skipped`;
    } else if (meta.reason) {
      subtitle = `Reason: ${meta.reason}`;
    }
    items.push({ id: `audit-${au.id}`, category: "moderation", title: AUDIT_LABELS[au.action] ?? au.action, subtitle, at: au.createdAt });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
};

export type ReportType =
  | "users"
  | "alumni"
  | "pending-approvals"
  | "events"
  | "event-rsvps"
  | "jobs"
  | "job-applications"
  | "achievements"
  | "donations"
  | "donations-summary";

interface ReportFilters {
  from?: Date;
  to?: Date;
  status?: string;
  department?: string;
}

type Row = Record<string, unknown>;

// A hard cap so a runaway export can never exhaust memory.
const MAX_ROWS = 50_000;

const d10 = (v?: Date | string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const dt = (v?: Date | string | null) =>
  v ? new Date(v).toISOString().slice(0, 16).replace("T", " ") : "";
const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
  u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
const dateRange = (from?: Date, to?: Date) =>
  from || to ? { ...(from && { gte: from }), ...(to && { lte: to }) } : undefined;

// Reports list alumni/students/recruiters — platform administrators are never
// included as report subjects. Use as a `User` where-filter, or nested under
// `{ user: NOT_ADMIN }` for records owned by a user.
const NOT_ADMIN = { roles: { none: { role: "ADMIN" as const } } };

/**
 * Generate an administrative report. Returns detailed rows (human-friendly
 * column labels) plus a small summary of headline KPIs. `format: "csv"`
 * streams the same rows as CSV; `json` returns `{ rows, summary }`.
 */
export const generateReport = async (
  input: ReportFilters & { type: ReportType; format: "csv" | "json" },
) => {
  const { rows, summary } = await buildReport(input.type, input);
  if (input.format === "json") return { rows, summary };
  return { csv: toCsv(rows) };
};

const buildReport = async (
  type: ReportType,
  f: ReportFilters,
): Promise<{ rows: Row[]; summary: Record<string, number | string> }> => {
  const created = dateRange(f.from, f.to);

  switch (type) {
    case "users":
    case "pending-approvals": {
      const forcedStatus = type === "pending-approvals" ? "PENDING" : f.status || undefined;
      const users = await prisma.user.findMany({
        where: {
          ...(created && { createdAt: created }),
          ...(forcedStatus && { status: forcedStatus as never }),
          ...(f.department && { profile: { department: f.department } }),
          ...NOT_ADMIN,
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdAt: true,
          roles: { select: { role: true } },
          profile: { select: { department: true, graduationYear: true, city: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = users.map((u) => ({
        Name: fullName(u),
        Email: u.email,
        Role: u.roles.map((r) => r.role).join(", "),
        Status: u.status,
        Department: u.profile?.department ?? "",
        "Graduation Year": u.profile?.graduationYear ?? "",
        City: u.profile?.city ?? "",
        Phone: u.profile?.phone ?? "",
        "Registered On": d10(u.createdAt),
      }));
      const summary: Record<string, number | string> = {
        Total: users.length,
        Approved: users.filter((u) => u.status === "APPROVED").length,
        Pending: users.filter((u) => u.status === "PENDING").length,
        Rejected: users.filter((u) => u.status === "REJECTED").length,
      };
      return { rows, summary };
    }

    case "alumni": {
      const profiles = await prisma.profile.findMany({
        where: {
          user: { status: "APPROVED", ...NOT_ADMIN },
          ...(f.department && { department: f.department }),
        },
        select: {
          department: true,
          graduationYear: true,
          currentCompany: true,
          currentRole: true,
          city: true,
          linkedinUrl: true,
          user: { select: { firstName: true, lastName: true, email: true, createdAt: true } },
        },
        orderBy: { graduationYear: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = profiles.map((p) => ({
        Name: fullName(p.user),
        Email: p.user?.email ?? "",
        Department: p.department ?? "",
        "Graduation Year": p.graduationYear ?? "",
        Company: p.currentCompany ?? "",
        Role: p.currentRole ?? "",
        City: p.city ?? "",
        LinkedIn: p.linkedinUrl ?? "",
      }));
      const employed = profiles.filter((p) => p.currentCompany).length;
      return {
        rows,
        summary: { "Total Alumni": profiles.length, Employed: employed },
      };
    }

    case "events": {
      const events = await prisma.event.findMany({
        where: {
          ...(created && { createdAt: created }),
          ...(f.status && { status: f.status as never }),
          ...(f.department && { department: f.department }),
        },
        select: {
          title: true,
          status: true,
          department: true,
          location: true,
          isOnline: true,
          startsAt: true,
          capacity: true,
          createdAt: true,
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { rsvps: true } },
        },
        orderBy: { startsAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = events.map((e) => ({
        Title: e.title,
        Status: e.status,
        Department: e.department ?? "All",
        Mode: e.isOnline ? "Online" : "In-person",
        Location: e.location ?? "",
        "Starts On": dt(e.startsAt),
        Capacity: e.capacity ?? "",
        RSVPs: e._count.rsvps,
        Organizer: fullName(e.createdBy),
        "Created On": d10(e.createdAt),
      }));
      return {
        rows,
        summary: {
          Total: events.length,
          Approved: events.filter((e) => e.status === "APPROVED").length,
          Pending: events.filter((e) => e.status === "PENDING").length,
          "Total RSVPs": events.reduce((s, e) => s + e._count.rsvps, 0),
        },
      };
    }

    case "event-rsvps": {
      const rsvps = await prisma.eventRsvp.findMany({
        where: { ...(created && { createdAt: created }), user: NOT_ADMIN },
        select: {
          status: true,
          emailRsvpStatus: true,
          createdAt: true,
          event: { select: { title: true, department: true, startsAt: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = rsvps.map((r) => ({
        Event: r.event?.title ?? "",
        Department: r.event?.department ?? "All",
        "Event Date": d10(r.event?.startsAt),
        Attendee: fullName(r.user),
        Email: r.user?.email ?? "",
        Response: r.status,
        "Via Email": r.emailRsvpStatus ?? "",
        "Responded On": d10(r.createdAt),
      }));
      return {
        rows,
        summary: {
          Total: rsvps.length,
          Going: rsvps.filter((r) => r.status === "GOING").length,
          Interested: rsvps.filter((r) => r.status === "INTERESTED").length,
        },
      };
    }

    case "jobs": {
      const jobs = await prisma.job.findMany({
        where: {
          ...(created && { createdAt: created }),
          ...(f.status && { status: f.status as never }),
          ...(f.department && { department: f.department }),
        },
        select: {
          title: true,
          company: true,
          status: true,
          department: true,
          location: true,
          employmentType: true,
          vacancies: true,
          isClosed: true,
          createdAt: true,
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = jobs.map((j) => ({
        Title: j.title,
        Company: j.company,
        Status: j.status,
        "Open/Closed": j.isClosed ? "Closed" : "Open",
        Type: j.employmentType,
        Department: j.department ?? "All",
        Location: j.location ?? "",
        Vacancies: j.vacancies,
        Applications: j._count.applications,
        "Posted By": fullName(j.createdBy),
        "Posted On": d10(j.createdAt),
      }));
      return {
        rows,
        summary: {
          Total: jobs.length,
          Approved: jobs.filter((j) => j.status === "APPROVED").length,
          Open: jobs.filter((j) => !j.isClosed).length,
          "Total Applications": jobs.reduce((s, j) => s + j._count.applications, 0),
        },
      };
    }

    case "job-applications": {
      const apps = await prisma.jobApplication.findMany({
        where: { ...(created && { createdAt: created }), user: NOT_ADMIN },
        select: {
          createdAt: true,
          resumeKey: true,
          job: { select: { title: true, company: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profile: { select: { currentCompany: true, city: true, graduationYear: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = apps.map((a) => ({
        Job: a.job?.title ?? "",
        Company: a.job?.company ?? "",
        Applicant: fullName(a.user),
        Email: a.user?.email ?? "",
        "Current Company": a.user?.profile?.currentCompany ?? "",
        "Graduation Year": a.user?.profile?.graduationYear ?? "",
        City: a.user?.profile?.city ?? "",
        Resume: a.resumeKey ? "Yes" : "No",
        "Applied On": d10(a.createdAt),
      }));
      return { rows, summary: { "Total Applications": apps.length } };
    }

    case "achievements": {
      const achievements = await prisma.achievement.findMany({
        where: {
          ...(created && { createdAt: created }),
          ...(f.status && { status: f.status as never }),
          user: NOT_ADMIN,
        },
        select: {
          title: true,
          category: true,
          status: true,
          occurredOn: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = achievements.map((a) => ({
        Title: a.title,
        Author: fullName(a.user),
        Email: a.user?.email ?? "",
        Category: a.category ?? "",
        Status: a.status,
        "Achieved On": d10(a.occurredOn),
        "Submitted On": d10(a.createdAt),
      }));
      return {
        rows,
        summary: {
          Total: achievements.length,
          Approved: achievements.filter((a) => a.status === "APPROVED").length,
          Pending: achievements.filter((a) => a.status === "PENDING").length,
        },
      };
    }

    case "donations": {
      const donations = await prisma.donation.findMany({
        where: {
          ...(created && { createdAt: created }),
          ...(f.status && { status: f.status as never }),
          user: NOT_ADMIN,
        },
        select: {
          receiptNo: true,
          donorName: true,
          donorEmail: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          razorpayPaymentId: true,
          isAnonymous: true,
          paidAt: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      const rows: Row[] = donations.map((d) => ({
        "Receipt No": d.receiptNo ?? "",
        Donor: d.donorName || fullName(d.user),
        Email: d.donorEmail || d.user?.email || "",
        "Amount (INR)": d.amount,
        Status: d.status,
        Method: d.paymentMethod ?? "",
        "Payment ID": d.razorpayPaymentId ?? "",
        Anonymous: d.isAnonymous ? "Yes" : "No",
        "Paid On": dt(d.paidAt),
        "Created On": d10(d.createdAt),
      }));
      const received = donations.filter((d) => d.status === "RECEIVED");
      return {
        rows,
        summary: {
          "Total Records": donations.length,
          "Received Count": received.length,
          "Total Received (INR)": received.reduce((s, d) => s + d.amount, 0),
        },
      };
    }

    case "donations-summary": {
      const donations = await prisma.donation.findMany({
        where: { status: "RECEIVED", ...(created && { createdAt: created }), user: NOT_ADMIN },
        select: { amount: true, paidAt: true, createdAt: true },
        take: MAX_ROWS,
      });
      const byMonth = new Map<string, { count: number; total: number }>();
      for (const d of donations) {
        const month = new Date(d.paidAt ?? d.createdAt).toISOString().slice(0, 7); // YYYY-MM
        const cur = byMonth.get(month) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += d.amount;
        byMonth.set(month, cur);
      }
      const rows: Row[] = [...byMonth.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([month, v]) => ({
          Month: month,
          Donations: v.count,
          "Amount Received (INR)": v.total,
        }));
      return {
        rows,
        summary: {
          Months: rows.length,
          "Total Received (INR)": donations.reduce((s, d) => s + d.amount, 0),
          Transactions: donations.length,
        },
      };
    }

    default:
      return { rows: [], summary: {} };
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