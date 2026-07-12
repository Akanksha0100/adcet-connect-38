/**
 * Integration tests for /api/v1/admin. All routes require ADMIN.
 * Validates user listing/getById, status changes (with notify side effect),
 * role assign/revoke, audit log, and report generation (CSV + JSON).
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const userToken = makeToken({ sub: "user-1" });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

describe("RBAC", () => {
  it("401 anonymous on every admin route", async () => {
    const res = await request(app).get("/api/v1/admin/users");
    expect(res.status).toBe(401);
  });

  it("403 when a regular user hits admin", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });
});

describe("/admin/users", () => {
  it("422 on invalid role filter", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users?role=GHOST")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(422);
  });

  it("200 list strips passwordHash", async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: "u1", email: "a@b.com", passwordHash: "secret", roles: [] } as any,
    ]);
    prisma.user.count.mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.items[0].passwordHash).toBeUndefined();
  });

  it("404 single user missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/admin/users/missing")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(404);
  });
});

describe("/admin/users/:id/status", () => {
  it("422 with invalid status", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users/u1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "PENDING" }); // not allowed
    expect(res.status).toBe(422);
  });

  it("404 when user not found", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(404);
  });

  it("200 approve writes audit log + notification", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1" } as any);
    prisma.user.update.mockResolvedValueOnce({ id: "u1", status: "APPROVED" } as any);
    prisma.auditLog.create.mockResolvedValueOnce({} as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(200);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("200 reject persists rejectionReason on user row", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1" } as any);
    prisma.user.update.mockResolvedValueOnce({ id: "u1", status: "REJECTED" } as any);
    prisma.auditLog.create.mockResolvedValueOnce({} as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "REJECTED", reason: "Suspicious" });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", rejectionReason: "Suspicious" }),
      }),
    );
  });
});

describe("/admin/approvals/export", () => {
  it("200 returns pending users shaped for the verification sheet", async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        firstName: "Alice",
        lastName: "A",
        email: "alice@x.com",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        profile: { department: "CSE", degree: "BE", graduationYear: 2020, linkedinUrl: "https://l.in/a" },
      } as any,
    ]);
    const res = await request(app)
      .get("/api/v1/admin/approvals/export?department=CSE&from=2026-06-01&to=2026-07-31")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      userId: "u1",
      email: "alice@x.com",
      department: "CSE",
      registeredOn: "2026-07-01",
    });
    // Only PENDING, non-admin users within the date/department window.
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          profile: { department: "CSE" },
        }),
      }),
    );
  });
});

describe("/admin/approvals/import", () => {
  it("422 when decisions are missing or malformed", async () => {
    const res = await request(app)
      .post("/api/v1/admin/approvals/import")
      .set("Authorization", bearer(adminToken))
      .send({ decisions: [{ decision: "MAYBE", email: "a@b.com" }] });
    expect(res.status).toBe(422);
  });

  it("422 when a decision has neither userId nor email", async () => {
    const res = await request(app)
      .post("/api/v1/admin/approvals/import")
      .set("Authorization", bearer(adminToken))
      .send({ decisions: [{ decision: "YES" }] });
    expect(res.status).toBe(422);
  });

  it("200 applies YES/NO to pending users and reports skips", async () => {
    // Lookup of all referenced users.
    prisma.user.findMany.mockResolvedValueOnce([
      { id: "11111111-1111-4111-8111-111111111111", email: "yes@x.com", status: "PENDING" },
      { id: "22222222-2222-4222-8222-222222222222", email: "no@x.com", status: "PENDING" },
      { id: "33333333-3333-4333-8333-333333333333", email: "done@x.com", status: "APPROVED" },
    ] as any);
    // setUserStatus internals for the two PENDING users. Each one does two
    // user.findUnique calls: its own lookup, then another inside notify().
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111" } as any)
      .mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111", email: "yes@x.com" } as any)
      .mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222" } as any)
      .mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222", email: "no@x.com" } as any);
    prisma.user.update
      .mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111", status: "APPROVED" } as any)
      .mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222", status: "REJECTED" } as any);

    const res = await request(app)
      .post("/api/v1/admin/approvals/import")
      .set("Authorization", bearer(adminToken))
      .send({
        decisions: [
          { userId: "11111111-1111-4111-8111-111111111111", decision: "YES" },
          { email: "no@x.com", decision: "NO" },
          { email: "done@x.com", decision: "YES" },
          { email: "ghost@x.com", decision: "NO" },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, approved: 1, rejected: 1 });
    expect(res.body.skipped).toHaveLength(2);
    expect(res.body.skipped.map((s: any) => s.reason)).toEqual(
      expect.arrayContaining(["Already approved", "User not found"]),
    );
    // NO rows get the default department-rejection reason.
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "Not verified by the department",
        }),
      }),
    );
  });
});

describe("/admin/users/:id/roles", () => {
  it("404 when user is missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/roles")
      .set("Authorization", bearer(adminToken))
      .send({ role: "ADMIN" });
    expect(res.status).toBe(404);
  });

  it("409 when role assignment violates uniqueness", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1" } as any);
    prisma.userRole.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/users/u1/roles")
      .set("Authorization", bearer(adminToken))
      .send({ role: "ADMIN" });
    expect(res.status).toBe(409);
  });

  it("204 revoke", async () => {
    prisma.userRole.deleteMany.mockResolvedValueOnce({ count: 1 } as any);
    const res = await request(app)
      .delete("/api/v1/admin/users/u1/roles/ADMIN")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(204);
  });
});

describe("/admin/audit-log & reports", () => {
  it("200 audit-log paginated", async () => {
    prisma.auditLog.findMany.mockResolvedValueOnce([]);
    prisma.auditLog.count.mockResolvedValueOnce(0);
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
  });

  it("422 reports with bogus type", async () => {
    const res = await request(app)
      .post("/api/v1/admin/reports")
      .set("Authorization", bearer(adminToken))
      .send({ type: "kittens", format: "json" });
    expect(res.status).toBe(422);
  });

  const sampleUser = {
    firstName: "A",
    lastName: "B",
    email: "a@b.com",
    status: "APPROVED",
    createdAt: new Date(),
    roles: [{ role: "ALUMNI" }],
    profile: { department: "CSE", graduationYear: 2020, city: "Pune", phone: null },
  };

  it("200 JSON users report", async () => {
    prisma.user.findMany.mockResolvedValueOnce([sampleUser as any]);
    const res = await request(app)
      .post("/api/v1/admin/reports")
      .set("Authorization", bearer(adminToken))
      .send({ type: "users", format: "json" });
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.summary).toBeDefined();
  });

  it("200 CSV report sets text/csv content-type", async () => {
    prisma.user.findMany.mockResolvedValueOnce([sampleUser as any]);
    const res = await request(app)
      .post("/api/v1/admin/reports")
      .set("Authorization", bearer(adminToken))
      .send({ type: "users", format: "csv" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("Name,Email");
  });
});