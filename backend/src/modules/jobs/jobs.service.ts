import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";
import { sendEmail, sendBulkEmails, type EmailAttachment } from "../../lib/mailer.js";
import { jobApplicationEmail, jobNotificationEmail } from "../../lib/email-templates.js";
import { getStorage } from "../../storage/index.js";
import { logger } from "../../lib/logger.js";

type Caller = { sub: string; roles: AppRoleName[] };
const isAdmin = (c?: Caller) => !!c?.roles.includes("ADMIN");

type EmploymentType = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
type ContentStatus = "PENDING" | "APPROVED" | "REJECTED";

export const list = async (
  q: PaginationQuery & {
    q?: string;
    company?: string;
    location?: string;
    employmentType?: EmploymentType;
    status?: ContentStatus;
    isRemote?: boolean;
    closed?: boolean;
    department?: string;
  },
  caller?: Caller,
) => {
  const where: Prisma.JobWhereInput = {
    ...(isAdmin(caller) ? { ...(q.status && { status: q.status }) } : { status: q.status ?? "APPROVED" }),
    ...(q.closed === undefined
      ? (isAdmin(caller) ? {} : { isClosed: false })
      : { isClosed: q.closed }),
    ...(q.company && { company: { contains: q.company, mode: "insensitive" } }),
    ...(q.location && { location: { contains: q.location, mode: "insensitive" } }),
    ...(q.employmentType && { employmentType: q.employmentType }),
    ...(q.isRemote !== undefined && { isRemote: q.isRemote }),
    ...(q.department && { department: q.department }),
    ...(q.q && {
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { company: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      ...paginate(q),
    }),
    prisma.job.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const getById = async (id: string) => {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      _count: { select: { applications: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!job) throw NotFound();
  return job;
};

export const create = async (caller: Caller, data: Omit<Prisma.JobUncheckedCreateInput, "createdById">) => {
  // Admin-created jobs are auto-approved
  const status = isAdmin(caller) ? "APPROVED" : "PENDING";
  const job = await prisma.job.create({ data: { ...data, createdById: caller.sub, status } });

  // If auto-approved (admin), fire department notifications
  if (status === "APPROVED") {
    sendJobNotifications(job).catch((err) =>
      logger.error({ err, jobId: job.id }, "failed to send job notification emails"),
    );
  }

  return job;
};

export const update = async (caller: Caller, id: string, data: Prisma.JobUpdateInput) => {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return prisma.job.update({ where: { id }, data });
};

export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  await prisma.job.delete({ where: { id } });
};

export const apply = async (
  jobId: string,
  userId: string,
  data: { resumeKey: string; coverLetter?: string },
) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw NotFound("Job not found");
  if (job.isClosed) throw Forbidden("Applications are closed for this job");
  if (job.status !== "APPROVED") throw Forbidden("Job is not open for applications");
  const application = await prisma.jobApplication.upsert({
    where: { jobId_userId: { jobId, userId } },
    update: { ...data },
    create: { jobId, userId, ...data },
  });

  // Fetch applicant info for the email
  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          department: true,
          graduationYear: true,
          currentCompany: true,
          currentRole: true,
          linkedinUrl: true,
        },
      },
    },
  });

  // Notify the poster in-app.
  await notify(job.createdById, {
    type: "job.application",
    title: `New application for "${job.title}"`,
    body: `${applicant ? `${applicant.firstName} ${applicant.lastName}` : "Someone"} applied to your posting at ${job.company}.`,
    data: { jobId, applicationId: application.id },
    sendEmailToo: false, // We send a richer email below
  });

  // Send rich HTML email to job poster with applicant info + resume attachment
  sendJobApplicationEmail(job, applicant, data).catch((err) =>
    logger.error({ err, jobId, userId }, "failed to send job application email"),
  );

  return application;
};

/**
 * Internal: Send a branded email to the job poster with applicant details
 * and resume attachment (if available).
 */
async function sendJobApplicationEmail(
  job: { id: string; title: string; company: string; createdById: string },
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      department?: string | null;
      graduationYear?: number | null;
      currentCompany?: string | null;
      currentRole?: string | null;
      linkedinUrl?: string | null;
    } | null;
  } | null,
  data: { resumeKey: string; coverLetter?: string },
) {
  if (!applicant) return;

  const poster = await prisma.user.findUnique({ where: { id: job.createdById } });
  if (!poster) return;

  // Check poster's email notification preference
  const prefs = await prisma.userPreferences.findUnique({ where: { userId: poster.id } });
  if (prefs && !prefs.notificationsEmail) return;

  const emailContent = jobApplicationEmail({
    jobTitle: job.title,
    company: job.company,
    jobId: job.id,
    applicantName: `${applicant.firstName} ${applicant.lastName}`.trim(),
    applicantEmail: applicant.email,
    applicantDepartment: applicant.profile?.department,
    applicantGradYear: applicant.profile?.graduationYear,
    applicantCompany: applicant.profile?.currentCompany,
    applicantRole: applicant.profile?.currentRole,
    applicantLinkedin: applicant.profile?.linkedinUrl,
    coverLetter: data.coverLetter,
  });

  // Try to attach resume if uploaded
  const attachments: EmailAttachment[] = [];
  if (data.resumeKey) {
    try {
      const storage = getStorage();
      const url = await storage.presignDownload(data.resumeKey);
      attachments.push({
        filename: "resume.pdf",
        path: url,
        contentType: "application/pdf",
      });
    } catch (err) {
      logger.warn({ err, resumeKey: data.resumeKey }, "Could not attach resume to email");
    }
  }

  await sendEmail({
    to: poster.email,
    ...emailContent,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}

export const listApplications = async (caller: Caller, jobId: string) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw NotFound();
  if (job.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return prisma.jobApplication.findMany({
    where: { jobId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profile: {
            select: {
              phone: true,
              city: true,
              country: true,
              department: true,
              graduationYear: true,
              currentCompany: true,
              currentRole: true,
              linkedinUrl: true,
              githubUrl: true,
            },
          },
        },
      },
    },
  });
};

/** Jobs posted by the caller (any status, including closed). */
export const myPostedJobs = async (caller: Caller, q: PaginationQuery) => {
  const where: Prisma.JobWhereInput = { createdById: caller.sub };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
      ...paginate(q),
    }),
    prisma.job.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

/** Owner or admin can close/reopen applications. */
export const setClosed = async (caller: Caller, id: string, closed: boolean) => {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw NotFound();
  if (existing.createdById !== caller.sub && !isAdmin(caller)) throw Forbidden();
  return prisma.job.update({
    where: { id },
    data: { isClosed: closed, closedAt: closed ? new Date() : null },
  });
};

export const myApplications = (userId: string) =>
  prisma.jobApplication.findMany({ where: { userId }, include: { job: true } });

export const moderate = async (
  id: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const job = await prisma.job.update({
    where: { id },
    data: { status, rejectionReason: status === "REJECTED" ? reason ?? null : null },
  });
  const verb = status === "APPROVED" ? "approved" : "rejected";
  await notify(job.createdById, {
    type: `job.${verb}`,
    title: `Your job posting was ${verb}`,
    body:
      status === "REJECTED"
        ? `"${job.title}" at ${job.company} was rejected.${reason ? ` Reason: ${reason}` : ""}`
        : `"${job.title}" at ${job.company} is now live.`,
    data: { jobId: job.id },
    sendEmailToo: true,
  });

  // When approved, send email notifications to department alumni (or all alumni)
  if (status === "APPROVED") {
    sendJobNotifications(job).catch((err) =>
      logger.error({ err, jobId: job.id }, "failed to send job notification emails"),
    );
  }

  return job;
};

/**
 * Send email notifications to all alumni in the targeted department (or all alumni
 * if department is null) when a job is approved.
 */
async function sendJobNotifications(job: {
  id: string;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  employmentType: string;
  department: string | null;
  description: string;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
}) {
  const whereClause: Prisma.UserWhereInput = {
    status: "APPROVED",
    roles: { some: { role: "ALUMNI" } },
  };

  if (job.department && job.department !== "All") {
    whereClause.profile = { department: job.department };
  }

  const alumni = await prisma.user.findMany({
    where: whereClause,
    select: {
      email: true,
      firstName: true,
      lastName: true,
      preferences: { select: { notificationsEmail: true } },
    },
  });

  const recipients = alumni.filter(
    (a) => !a.preferences || a.preferences.notificationsEmail,
  );

  if (recipients.length === 0) return;

  const emails = recipients.map((recipient) => {
    const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim() || "Alumni";
    return {
      to: recipient.email,
      ...jobNotificationEmail(
        {
          title: job.title,
          company: job.company,
          jobId: job.id,
          location: job.location,
          isRemote: job.isRemote,
          employmentType: job.employmentType,
          department: job.department,
          description: job.description,
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
        },
        recipientName,
      ),
    };
  });

  logger.info(
    { jobId: job.id, recipientCount: emails.length },
    `Sending job notification emails for "${job.title}"`,
  );

  await sendBulkEmails(emails);
}

export const listPending = async (q: PaginationQuery) => {
  const where = { status: "PENDING" as const };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
      ...paginate(q),
    }),
    prisma.job.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};