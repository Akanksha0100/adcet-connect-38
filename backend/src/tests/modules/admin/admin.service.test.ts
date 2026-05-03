import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));

const svc = await import("../../../modules/admin/admin.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
});

describe("modules/admin/service — listUsers", () => {
  it("strips passwordHash from every returned user", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: "u-1", email: "a@b", passwordHash: "secret", roles: [], profile: null },
    ]);
    prismaMock.user.count.mockResolvedValueOnce(1);
    const out = await svc.listUsers({ page: 1, pageSize: 10 } as any);
    expect((out.items[0] as any).passwordHash).toBeUndefined();
  });

  it("applies status / role / search filters when provided", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    prismaMock.user.count.mockResolvedValueOnce(0);
    await svc.listUsers({
      page: 1,
      pageSize: 10,
      status: "PENDING",
      role: "ADMIN",
      q: "alice",
    } as any);
    const where = (prismaMock.user.findMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe("PENDING");
    expect(where.roles.some.role).toBe("ADMIN");
    expect(where.OR).toHaveLength(3);
  });
});

describe("modules/admin/service — getUserById", () => {
  it("404 when user missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getUserById("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("returns user with roles+profile and no passwordHash", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      email: "a@b",
      passwordHash: "secret",
      roles: [{ role: "ALUMNI" }],
      profile: { department: "CS" },
    });
    const out = await svc.getUserById("u-1");
    expect((out as any).passwordHash).toBeUndefined();
    expect((out as any).profile.department).toBe("CS");
  });
});

describe("modules/admin/service — setUserStatus", () => {
  it("404 when target user missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.setUserStatus("admin-1", "u-1", "APPROVED"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("APPROVED clears any prior rejectionReason and writes audit log", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    prismaMock.user.update.mockResolvedValueOnce({ id: "u-1", status: "APPROVED" });
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    await svc.setUserStatus("admin-1", "u-1", "APPROVED");
    expect((prismaMock.user.update.mock.calls[0][0] as any).data).toEqual({
      status: "APPROVED",
      rejectionReason: null,
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ type: "account.approved", sendEmailToo: true }),
    );
  });

  it("REJECTED stores reason in DB and audit metadata + notification body", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    prismaMock.user.update.mockResolvedValueOnce({ id: "u-1", status: "REJECTED" });
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    await svc.setUserStatus("admin-1", "u-1", "REJECTED", "Unverified affiliation");
    expect((prismaMock.user.update.mock.calls[0][0] as any).data.rejectionReason).toBe(
      "Unverified affiliation",
    );
    expect((prismaMock.auditLog.create.mock.calls[0][0] as any).data.metadata).toEqual({
      reason: "Unverified affiliation",
    });
    expect(notifyMock.mock.calls[0][1].body).toContain("Unverified affiliation");
  });
});

describe("modules/admin/service — role assignment", () => {
  it("assignRole: 404 when user missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.assignRole("u-1", "ADMIN")).rejects.toMatchObject({ status: 404 });
  });

  it("assignRole: 409 when role already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    prismaMock.userRole.create.mockRejectedValueOnce(new Error("dup"));
    await expect(svc.assignRole("u-1", "ADMIN")).rejects.toMatchObject({ status: 409 });
  });

  it("revokeRole deletes matching rows", async () => {
    prismaMock.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });
    await svc.revokeRole("u-1", "ADMIN");
    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", role: "ADMIN" },
    });
  });
});

describe("modules/admin/service — generateReport", () => {
  it("returns JSON rows when format=json", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "u-1" }]);
    const out = await svc.generateReport({ type: "users", format: "json" } as any);
    expect(out).toEqual({ rows: [{ id: "u-1" }] });
  });

  it("returns CSV string when format=csv", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: "u-1", email: "a@b", firstName: "A", lastName: "B", status: "APPROVED" },
    ]);
    const out = await svc.generateReport({ type: "users", format: "csv" } as any);
    expect("csv" in out).toBe(true);
    expect((out as any).csv).toContain("u-1");
    expect((out as any).csv).toContain("a@b");
  });
});