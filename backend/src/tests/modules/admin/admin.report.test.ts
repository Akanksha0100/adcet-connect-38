/**
 * Branch coverage for admin: generateReport (CSV escaping, all report types,
 * empty-row branch), role assign Conflict on duplicate, revokeRole, audit log,
 * and date-range filter shape.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: jest.fn(async () => undefined),
  create: jest.fn(),
}));

const svc = await import("../../../modules/admin/admin.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("admin.service — generateReport", () => {
  it("JSON: returns rows for users", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "u-1", email: "a@b" }]);
    const out = await svc.generateReport({ type: "users", format: "json" });
    expect(out).toEqual({ rows: [{ id: "u-1", email: "a@b" }] });
  });

  it("CSV: empty rows return empty string", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    expect(await svc.generateReport({ type: "events", format: "csv" })).toEqual({ csv: "" });
  });

  it("CSV: properly escapes quotes, commas, newlines", async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([
      { id: "j-1", title: 'A "tricky", title\nwith newline', company: "Acme" },
    ]);
    const out = (await svc.generateReport({ type: "jobs", format: "csv" })) as { csv: string };
    expect(out.csv).toContain('"A ""tricky"", title\nwith newline"');
    expect(out.csv.split("\n")[0]).toBe("id,title,company");
  });

  it("CSV: handles null/undefined cell values as empty", async () => {
    prismaMock.donation.findMany.mockResolvedValueOnce([{ id: "d-1", amount: null }]);
    const out = (await svc.generateReport({ type: "donations", format: "csv" })) as { csv: string };
    expect(out.csv).toBe("id,amount\nd-1,");
  });

  it("achievements path", async () => {
    prismaMock.achievement.findMany.mockResolvedValueOnce([{ id: "a-1" }]);
    const out = await svc.generateReport({ type: "achievements", format: "json" });
    expect(out).toEqual({ rows: [{ id: "a-1" }] });
  });

  it("alumni path uses approved-user filter", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);
    await svc.generateReport({ type: "alumni", format: "json" });
    expect((prismaMock.profile.findMany.mock.calls[0][0] as any).where.user.status).toBe("APPROVED");
  });

  it("unknown type falls through to empty rows", async () => {
    const out = await svc.generateReport({ type: "bogus" as any, format: "json" });
    expect(out).toEqual({ rows: [] });
  });

  it("from/to filter is forwarded as createdAt range", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");
    await svc.generateReport({ type: "users", format: "json", from, to });
    const where = (prismaMock.user.findMany.mock.calls[0][0] as any).where;
    expect(where.createdAt).toEqual({ gte: from, lte: to });
  });
});

describe("admin.service — role mutations", () => {
  it("assignRole 404 when user missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.assignRole("missing", "ADMIN")).rejects.toMatchObject({ status: 404 });
  });
  it("assignRole maps unique-violation to 409 Conflict", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    prismaMock.userRole.create.mockRejectedValueOnce(new Error("dup"));
    await expect(svc.assignRole("u-1", "ADMIN")).rejects.toMatchObject({ status: 409 });
  });
  it("assignRole success returns the new row", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    prismaMock.userRole.create.mockResolvedValueOnce({ id: "r-1", role: "ADMIN" });
    expect(await svc.assignRole("u-1", "ADMIN")).toMatchObject({ role: "ADMIN" });
  });
  it("revokeRole forwards to deleteMany", async () => {
    prismaMock.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });
    await svc.revokeRole("u-1", "ADMIN");
    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", role: "ADMIN" },
    });
  });
});

describe("admin.service — getAuditLog", () => {
  it("returns paginated rows", async () => {
    prismaMock.auditLog.findMany.mockResolvedValueOnce([{ id: "a-1" }]);
    prismaMock.auditLog.count.mockResolvedValueOnce(1);
    const out = await svc.getAuditLog({ page: 1, pageSize: 10 } as any);
    expect(out.items).toHaveLength(1);
    expect(out.pagination.total).toBe(1);
  });
});