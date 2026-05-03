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

  it("moderate APPROVED notifies the author with sendEmailToo", async () => {
    prismaMock.achievement.update.mockResolvedValueOnce({
      id: "a-1",
      title: "Award",
      userId: "u-1",
    });
    await svc.moderate("a-1", "APPROVED");
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ type: "achievement.approved", sendEmailToo: true }),
    );
  });

  it("moderate REJECTED writes rejectionReason", async () => {
    prismaMock.achievement.update.mockResolvedValueOnce({
      id: "a-1",
      title: "Award",
      userId: "u-1",
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