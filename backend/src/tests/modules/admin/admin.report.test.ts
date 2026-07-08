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
  it("JSON: returns detailed rows + summary for users", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        firstName: "Alice",
        lastName: "A",
        email: "a@b",
        status: "APPROVED",
        createdAt: new Date("2024-05-01"),
        roles: [{ role: "ALUMNI" }],
        profile: { department: "CSE", graduationYear: 2020, city: "Pune", phone: "123" },
      },
    ]);
    const out = (await svc.generateReport({ type: "users", format: "json" })) as any;
    expect(out.rows[0]).toMatchObject({
      Name: "Alice A",
      Email: "a@b",
      Role: "ALUMNI",
      Status: "APPROVED",
      Department: "CSE",
    });
    expect(out.summary).toMatchObject({ Total: 1, Approved: 1 });
  });

  it("CSV: empty rows return empty string", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    expect(await svc.generateReport({ type: "events", format: "csv" })).toEqual({ csv: "" });
  });

  it("CSV: properly escapes quotes, commas, newlines", async () => {
    prismaMock.achievement.findMany.mockResolvedValueOnce([
      {
        title: 'A "tricky", title\nwith newline',
        category: "Award",
        status: "APPROVED",
        occurredOn: null,
        createdAt: new Date("2024-01-01"),
        user: { firstName: "Bob", lastName: "B", email: "bob@x" },
      },
    ]);
    const out = (await svc.generateReport({ type: "achievements", format: "csv" })) as { csv: string };
    expect(out.csv).toContain('"A ""tricky"", title\nwith newline"');
    expect(out.csv.split("\n")[0]).toBe("Title,Author,Email,Category,Status,Achieved On,Submitted On");
  });

  it("donations: computes total received in summary", async () => {
    prismaMock.donation.findMany.mockResolvedValueOnce([
      { amount: 5000, status: "RECEIVED", user: null, paidAt: new Date("2024-06-01"), createdAt: new Date("2024-06-01") },
      { amount: 1000, status: "PLEDGED", user: null, paidAt: null, createdAt: new Date("2024-06-02") },
    ]);
    const out = (await svc.generateReport({ type: "donations", format: "json" })) as any;
    expect(out.summary).toMatchObject({ "Total Records": 2, "Received Count": 1, "Total Received (INR)": 5000 });
  });

  it("alumni path uses approved-user filter", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([{ user: { firstName: "A", lastName: "B", email: "a@b" } }]);
    await svc.generateReport({ type: "alumni", format: "json" });
    expect((prismaMock.profile.findMany.mock.calls[0][0] as any).where.user.status).toBe("APPROVED");
  });

  it("pending-approvals forces status=PENDING", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    await svc.generateReport({ type: "pending-approvals", format: "json" });
    expect((prismaMock.user.findMany.mock.calls[0][0] as any).where.status).toBe("PENDING");
  });

  it("status + department filters are forwarded (jobs)", async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([]);
    await svc.generateReport({ type: "jobs", format: "json", status: "APPROVED", department: "CSE" });
    const where = (prismaMock.job.findMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe("APPROVED");
    expect(where.department).toBe("CSE");
  });

  it("unknown type falls through to empty rows", async () => {
    const out = (await svc.generateReport({ type: "bogus" as any, format: "json" })) as any;
    expect(out.rows).toEqual([]);
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