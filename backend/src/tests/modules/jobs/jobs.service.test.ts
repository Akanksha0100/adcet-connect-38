import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));

const svc = await import("../../../modules/jobs/jobs.service.js");

const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin-1", roles: ["ADMIN"] as any };

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
});

describe("modules/jobs/service — list", () => {
  it("non-admin caller is forced to status=APPROVED", async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([]);
    prismaMock.job.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 10 } as any, ALUMNI);
    const where = (prismaMock.job.findMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe("APPROVED");
  });

  it("admin can request a specific status", async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([]);
    prismaMock.job.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 10, status: "PENDING" } as any, ADMIN);
    const where = (prismaMock.job.findMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe("PENDING");
  });

  it("returns paginated shape", async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([{ id: "j-1" }]);
    prismaMock.job.count.mockResolvedValueOnce(1);
    const out = await svc.list({ page: 1, pageSize: 10 } as any, ADMIN);
    expect(out).toMatchObject({
      items: [{ id: "j-1" }],
      pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    });
  });
});

describe("modules/jobs/service — getById / create / update / remove", () => {
  it("getById throws NotFound when missing", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getById("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("getById includes createdBy + counts", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1" });
    await svc.getById("j-1");
    const arg = prismaMock.job.findUnique.mock.calls[0][0] as any;
    expect(arg.include.createdBy).toBeDefined();
    expect(arg.include._count.select.applications).toBe(true);
  });

  it("create stamps createdById from caller", async () => {
    prismaMock.job.create.mockResolvedValueOnce({ id: "j-1" });
    await svc.create(ALUMNI, { title: "x" } as any);
    const arg = prismaMock.job.create.mock.calls[0][0] as any;
    expect(arg.data.createdById).toBe("u-1");
  });

  it("update: 404 if not found", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce(null);
    await expect(svc.update(ALUMNI, "j-1", {} as any)).rejects.toMatchObject({ status: 404 });
  });

  it("update: 403 if non-owner & non-admin", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1", createdById: "other" });
    await expect(svc.update(ALUMNI, "j-1", {} as any)).rejects.toMatchObject({ status: 403 });
  });

  it("update: owner can edit", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1", createdById: "u-1" });
    prismaMock.job.update.mockResolvedValueOnce({ id: "j-1" });
    await expect(svc.update(ALUMNI, "j-1", { title: "y" } as any)).resolves.toBeDefined();
  });

  it("update: admin can edit any job", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1", createdById: "other" });
    prismaMock.job.update.mockResolvedValueOnce({ id: "j-1" });
    await expect(svc.update(ADMIN, "j-1", {} as any)).resolves.toBeDefined();
  });

  it("remove: 403 for non-owner non-admin", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1", createdById: "other" });
    await expect(svc.remove(ALUMNI, "j-1")).rejects.toMatchObject({ status: 403 });
  });
});

describe("modules/jobs/service — moderate", () => {
  it("APPROVED clears rejectionReason and notifies the poster", async () => {
    prismaMock.job.update.mockResolvedValueOnce({
      id: "j-1",
      title: "Dev",
      company: "Acme",
      createdById: "u-1",
    });
    await svc.moderate("j-1", "APPROVED");
    expect(prismaMock.job.update.mock.calls[0][0]).toMatchObject({
      where: { id: "j-1" },
      data: { status: "APPROVED", rejectionReason: null },
    });
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ type: "job.approved", sendEmailToo: true }),
    );
  });

  it("REJECTED persists the reason and includes it in the notification body", async () => {
    prismaMock.job.update.mockResolvedValueOnce({
      id: "j-1",
      title: "Dev",
      company: "Acme",
      createdById: "u-1",
    });
    await svc.moderate("j-1", "REJECTED", "Spam");
    expect((prismaMock.job.update.mock.calls[0][0] as any).data.rejectionReason).toBe("Spam");
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ body: expect.stringContaining("Spam") }),
    );
  });
});

describe("modules/jobs/service — apply / applications", () => {
  it("apply upserts on the (job, user) compound key", async () => {
    prismaMock.jobApplication.upsert.mockResolvedValueOnce({ id: "ja-1" });
    await svc.apply("j-1", "u-1", { coverLetter: "hi" });
    const arg = prismaMock.jobApplication.upsert.mock.calls[0][0] as any;
    expect(arg.where).toEqual({ jobId_userId: { jobId: "j-1", userId: "u-1" } });
  });

  it("listApplications: 403 if non-owner non-admin", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce({ id: "j-1", createdById: "other" });
    await expect(svc.listApplications(ALUMNI, "j-1")).rejects.toMatchObject({ status: 403 });
  });

  it("listApplications: 404 if job missing", async () => {
    prismaMock.job.findUnique.mockResolvedValueOnce(null);
    await expect(svc.listApplications(ADMIN, "j-1")).rejects.toMatchObject({ status: 404 });
  });
});