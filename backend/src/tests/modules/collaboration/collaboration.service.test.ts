import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));
const sendEmailMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../lib/mailer.js", () => ({
  sendEmail: sendEmailMock,
  sendBulkEmails: jest.fn(),
}));

const svc = await import("../../../modules/collaboration/collaboration.service.js");

const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const OTHER = { sub: "u-2", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin-1", roles: ["ADMIN"] as any };
const PAGE = { page: 1, pageSize: 20 } as any;

/** The `where` passed to Prisma on the Nth findMany call. */
const whereOf = (call = 0) =>
  (prismaMock.collaborationRequest.findMany.mock.calls[call][0] as any).where;

const stubList = () => {
  prismaMock.collaborationRequest.findMany.mockResolvedValueOnce([]);
  prismaMock.collaborationRequest.count.mockResolvedValueOnce(0);
};

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
  sendEmailMock.mockClear();
});

describe("modules/collaboration/service", () => {
  describe("list", () => {
    it("locks a member to their own requests, whatever they ask for", async () => {
      stubList();
      await svc.list({ ...PAGE, type: "PLACEMENT" }, ALUMNI);
      expect(whereOf(0).AND).toContainEqual({ userId: "u-1" });
    });

    it("does not scope an admin to their own requests", async () => {
      stubList();
      await svc.list({ ...PAGE, status: "PENDING", type: "PLACEMENT" }, ADMIN);
      expect(whereOf(0).AND).not.toContainEqual({ userId: "admin-1" });
      expect(whereOf(0).AND).toContainEqual({ status: "PENDING" });
    });

    it("an admin asking for `mine` gets only their own", async () => {
      stubList();
      await svc.list({ ...PAGE, mine: true }, ADMIN);
      expect(whereOf(0).AND).toContainEqual({ userId: "admin-1" });
    });

    it("filters by type when given one", async () => {
      stubList();
      await svc.list({ ...PAGE, type: "WORKSHOP" }, ALUMNI);
      expect(whereOf(0).AND).toContainEqual({ type: "WORKSHOP" });
    });
  });

  describe("getById", () => {
    it("404s when missing", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce(null);
      await expect(svc.getById(ALUMNI, "nope")).rejects.toMatchObject({ status: 404 });
    });

    it("403s for a member reading somebody else's request", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "u-1",
      } as any);
      await expect(svc.getById(OTHER, "c1")).rejects.toMatchObject({ status: 403 });
    });

    it("lets an admin read anyone's request", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "u-1",
      } as any);
      await expect(svc.getById(ADMIN, "c1")).resolves.toMatchObject({ id: "c1" });
    });
  });

  it("create stamps userId from the caller", async () => {
    prismaMock.collaborationRequest.create.mockResolvedValueOnce({});
    await svc.create(ALUMNI, { type: "PLACEMENT", title: "Infosys drive" } as any);
    expect((prismaMock.collaborationRequest.create.mock.calls[0][0] as any).data.userId).toBe("u-1");
  });

  describe("remove", () => {
    it("withdraws the author's own pending request", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "u-1",
        status: "PENDING",
      } as any);
      await svc.remove(ALUMNI, "c1");
      expect(prismaMock.collaborationRequest.delete).toHaveBeenCalled();
    });

    it("refuses to withdraw once the office has decided", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "u-1",
        status: "APPROVED",
      } as any);
      await expect(svc.remove(ALUMNI, "c1")).rejects.toMatchObject({ status: 403 });
      expect(prismaMock.collaborationRequest.delete).not.toHaveBeenCalled();
    });

    it("403s on someone else's request", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "u-1",
        status: "PENDING",
      } as any);
      await expect(svc.remove(OTHER, "c1")).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("moderate", () => {
    const row = {
      id: "c1",
      userId: "u-1",
      type: "PLACEMENT" as const,
      title: "Infosys drive",
      organization: "Infosys",
      departments: ["Computer Science and Engineering"],
      candidatesRequired: 20,
      packageLpa: 6.5,
      driveDate: new Date("2026-09-10"),
      jobRole: "SE Trainee",
      eligibility: null,
      mode: "ON_CAMPUS" as const,
      user: { id: "u-1", firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    };

    it("stamps the reviewer, notifies the author and emails them", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({ id: "c1" } as any);
      prismaMock.collaborationRequest.update.mockResolvedValueOnce({
        ...row,
        status: "APPROVED",
      } as any);

      await svc.moderate("admin-1", "c1", "APPROVED");

      const data = (prismaMock.collaborationRequest.update.mock.calls[0][0] as any).data;
      expect(data).toMatchObject({ status: "APPROVED", reviewedById: "admin-1" });
      expect(data.reviewedAt).toBeInstanceOf(Date);
      expect(notifyMock).toHaveBeenCalledWith(
        "u-1",
        expect.objectContaining({ type: "collaboration.approved" }),
      );
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: "alice@adcet.in" }),
      );
    });

    it("stores the rejection reason and passes it to the author", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({ id: "c1" } as any);
      prismaMock.collaborationRequest.update.mockResolvedValueOnce({
        ...row,
        status: "REJECTED",
      } as any);

      await svc.moderate("admin-1", "c1", "REJECTED", "Dates clash with exams");

      expect((prismaMock.collaborationRequest.update.mock.calls[0][0] as any).data)
        .toMatchObject({ rejectionReason: "Dates clash with exams" });
      expect(notifyMock.mock.calls[0][1] as any).toMatchObject({
        body: expect.stringContaining("Dates clash with exams"),
      });
    });

    it("clears a stale reason when a rejected request is approved after all", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({ id: "c1" } as any);
      prismaMock.collaborationRequest.update.mockResolvedValueOnce({
        ...row,
        status: "APPROVED",
      } as any);
      await svc.moderate("admin-1", "c1", "APPROVED");
      expect((prismaMock.collaborationRequest.update.mock.calls[0][0] as any).data
        .rejectionReason).toBeNull();
    });

    it("404s on an unknown request", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce(null);
      await expect(svc.moderate("admin-1", "nope", "APPROVED")).rejects.toMatchObject({
        status: 404,
      });
      expect(prismaMock.collaborationRequest.update).not.toHaveBeenCalled();
    });

    it("a failing mailer does not undo the decision", async () => {
      prismaMock.collaborationRequest.findUnique.mockResolvedValueOnce({ id: "c1" } as any);
      prismaMock.collaborationRequest.update.mockResolvedValueOnce({
        ...row,
        status: "APPROVED",
      } as any);
      sendEmailMock.mockRejectedValueOnce(new Error("smtp down") as never);
      await expect(svc.moderate("admin-1", "c1", "APPROVED")).resolves.toMatchObject({
        status: "APPROVED",
      });
    });
  });

  it("pendingCounts reports zero for a type with no pending rows", async () => {
    prismaMock.collaborationRequest.groupBy.mockResolvedValueOnce([
      { type: "PLACEMENT", _count: { _all: 3 } },
    ] as any);
    await expect(svc.pendingCounts()).resolves.toEqual({ PLACEMENT: 3, WORKSHOP: 0 });
  });
});
