import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));

const svc = await import("../../../modules/achievements/achievements.service.js");
const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin", roles: ["ADMIN"] as any };

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
});

describe("modules/achievements/service", () => {
  it("list: anonymous caller is locked to APPROVED", async () => {
    prismaMock.achievement.findMany.mockResolvedValueOnce([]);
    prismaMock.achievement.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5 } as any);
    expect((prismaMock.achievement.findMany.mock.calls[0][0] as any).where.status).toBe("APPROVED");
  });

  it("create stamps userId from caller", async () => {
    prismaMock.achievement.create.mockResolvedValueOnce({});
    await svc.create(ALUMNI, { title: "Won" } as any);
    expect((prismaMock.achievement.create.mock.calls[0][0] as any).data.userId).toBe("u-1");
  });

  it("getById: 404 when missing", async () => {
    prismaMock.achievement.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getById("x")).rejects.toMatchObject({ status: 404 });
  });

  it("update: owner check", async () => {
    prismaMock.achievement.findUnique.mockResolvedValueOnce({ userId: "other" });
    await expect(svc.update(ALUMNI, "a-1", {} as any)).rejects.toMatchObject({ status: 403 });
  });

  it("moderate APPROVED notifies the author in-app (branded email sent separately)", async () => {
    prismaMock.achievement.update.mockResolvedValueOnce({
      id: "a-1",
      title: "Award",
      description: "Won a national award",
      userId: "u-1",
      user: { firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    });
    prismaMock.siteSection.findUnique.mockResolvedValueOnce(null);
    await svc.moderate("a-1", "APPROVED");
    // Approval emails the author with a rich branded template directly, so the
    // in-app notification is dispatched WITHOUT the generic email (sendEmailToo=false).
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ type: "achievement.approved", sendEmailToo: false }),
    );
  });

  it("moderate REJECTED writes rejectionReason", async () => {
    prismaMock.achievement.update.mockResolvedValueOnce({
      id: "a-1",
      title: "Award",
      description: "Won a national award",
      userId: "u-1",
      user: { firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    });
    await svc.moderate("a-1", "REJECTED", "Unverified");
    expect((prismaMock.achievement.update.mock.calls[0][0] as any).data.rejectionReason).toBe(
      "Unverified",
    );
  });

  it("listPending always filters status=PENDING", async () => {
    prismaMock.achievement.findMany.mockResolvedValueOnce([]);
    prismaMock.achievement.count.mockResolvedValueOnce(0);
    await svc.listPending({ page: 1, pageSize: 5 } as any);
    expect((prismaMock.achievement.findMany.mock.calls[0][0] as any).where).toEqual({
      status: "PENDING",
    });
  });
});

describe("achievements/service — branch coverage extras", () => {
  it("list: admin can request a status; alumni request is ignored & forced to APPROVED", async () => {
    prismaMock.achievement.findMany.mockResolvedValue([]);
    prismaMock.achievement.count.mockResolvedValue(0);
    await svc.list({ page: 1, pageSize: 5, status: "PENDING" } as any, ADMIN);
    expect((prismaMock.achievement.findMany.mock.calls[0][0] as any).where.status).toBe("PENDING");

    await svc.list({ page: 1, pageSize: 5 } as any, ALUMNI);
    expect((prismaMock.achievement.findMany.mock.calls[1][0] as any).where.status).toBe("APPROVED");
  });

  it("list: q + userId build OR + userId filter", async () => {
    prismaMock.achievement.findMany.mockResolvedValueOnce([]);
    prismaMock.achievement.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5, q: "win", userId: "u-2" } as any);
    const where = (prismaMock.achievement.findMany.mock.calls[0][0] as any).where;
    expect(where.userId).toBe("u-2");
    expect(where.OR).toHaveLength(2);
  });

  it("update: 404 when missing; admin can update someone else's row", async () => {
    prismaMock.achievement.findUnique.mockResolvedValueOnce(null);
    await expect(svc.update(ALUMNI, "x", {} as any)).rejects.toMatchObject({ status: 404 });

    prismaMock.achievement.findUnique.mockResolvedValueOnce({ userId: "other" });
    prismaMock.achievement.update.mockResolvedValueOnce({});
    await expect(svc.update(ADMIN, "a-1", {} as any)).resolves.toBeDefined();
  });

  it("remove: 404 / 403 / owner / admin branches", async () => {
    prismaMock.achievement.findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove(ALUMNI, "x")).rejects.toMatchObject({ status: 404 });

    prismaMock.achievement.findUnique.mockResolvedValueOnce({ userId: "other" });
    await expect(svc.remove(ALUMNI, "a-1")).rejects.toMatchObject({ status: 403 });

    prismaMock.achievement.findUnique.mockResolvedValueOnce({ userId: "u-1" });
    prismaMock.achievement.delete.mockResolvedValueOnce({});
    await expect(svc.remove(ALUMNI, "a-1")).resolves.toBeUndefined();

    prismaMock.achievement.findUnique.mockResolvedValueOnce({ userId: "other" });
    prismaMock.achievement.delete.mockResolvedValueOnce({});
    await expect(svc.remove(ADMIN, "a-1")).resolves.toBeUndefined();
  });

  it("moderate APPROVED clears prior rejectionReason", async () => {
    prismaMock.achievement.update.mockResolvedValueOnce({
      id: "a-1",
      title: "x",
      description: "desc",
      userId: "u-1",
      user: { firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    });
    prismaMock.siteSection.findUnique.mockResolvedValueOnce(null);
    await svc.moderate("a-1", "APPROVED");
    expect((prismaMock.achievement.update.mock.calls[0][0] as any).data.rejectionReason).toBeNull();
  });

  it("getById includes user details", async () => {
    prismaMock.achievement.findUnique.mockResolvedValueOnce({ id: "a-1" });
    await svc.getById("a-1");
    expect((prismaMock.achievement.findUnique.mock.calls[0][0] as any).include.user).toBeDefined();
  });
});