import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, paginationSchema } from "../../lib/pagination.js";

const jobInput = z.object({
  title: z.string().min(2).max(200),
  company: z.string().min(1).max(160),
  location: z.string().max(200).optional(),
  isRemote: z.boolean().optional().default(false),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  experienceMin: z.coerce.number().int().min(0).optional(),
  experienceMax: z.coerce.number().int().min(0).optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
  currency: z.string().max(8).optional(),
  description: z.string().min(10).max(20000),
  requirements: z.string().max(20000).optional(),
  vacancies: z.coerce.number().int().min(1).default(1),
  applyUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

const listQuery = paginationSchema.extend({
  q: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  optionalAuth,
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const where: any = {
      status: q.status ?? "APPROVED",
      ...(q.company && { company: { contains: q.company, mode: "insensitive" } }),
      ...(q.location && { location: { contains: q.location, mode: "insensitive" } }),
      ...(q.employmentType && { employmentType: q.employmentType }),
      ...(q.q && {
        OR: [
          { title: { contains: q.q, mode: "insensitive" } },
          { company: { contains: q.q, mode: "insensitive" } },
          { description: { contains: q.q, mode: "insensitive" } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.job.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(q) }),
      prisma.job.count({ where }),
    ]);
    res.json({ items, pagination: paginationMeta(total, q) });
  }),
);

jobsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw NotFound();
    res.json(job);
  }),
);

jobsRouter.post(
  "/",
  requireAuth,
  validate(jobInput),
  asyncHandler(async (req, res) => {
    const job = await prisma.job.create({ data: { ...req.body, createdById: req.auth!.sub } });
    res.status(201).json(job);
  }),
);

jobsRouter.patch(
  "/:id",
  requireAuth,
  validate(jobInput.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound();
    if (existing.createdById !== req.auth!.sub && !req.auth!.roles.includes("ADMIN")) throw Forbidden();
    const updated = await prisma.job.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  }),
);

jobsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound();
    if (existing.createdById !== req.auth!.sub && !req.auth!.roles.includes("ADMIN")) throw Forbidden();
    await prisma.job.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

jobsRouter.post(
  "/:id/apply",
  requireAuth,
  validate(z.object({ resumeKey: z.string().optional(), coverLetter: z.string().max(5000).optional() })),
  asyncHandler(async (req, res) => {
    const application = await prisma.jobApplication.upsert({
      where: { jobId_userId: { jobId: req.params.id, userId: req.auth!.sub } },
      update: { resumeKey: req.body.resumeKey, coverLetter: req.body.coverLetter },
      create: { jobId: req.params.id, userId: req.auth!.sub, ...req.body },
    });
    res.status(201).json(application);
  }),
);