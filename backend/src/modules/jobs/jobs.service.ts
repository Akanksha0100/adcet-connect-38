import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { notify } from "../notifications/notifications.service.js";

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

export const create = (caller: Caller, data: Omit<Prisma.JobUncheckedCreateInput, "createdById">) =>
  prisma.job.create({ data: { ...data, createdById: caller.sub } });

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
  // Notify the poster.
  await notify(job.createdById, {
    type: "job.application",
    title: `New application for "${job.title}"`,
    body: `Someone applied to your posting at ${job.company}.`,
    data: { jobId, applicationId: application.id },
    sendEmailToo: true,
  });
  return application;
};

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
  return job;
};

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