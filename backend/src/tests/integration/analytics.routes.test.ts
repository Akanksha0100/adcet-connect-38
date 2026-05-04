/**
 * Integration tests for /api/v1/analytics. The user-facing dashboard
 * endpoints require an APPROVED user; the admin overview also enforces ADMIN.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const userToken = makeToken({ sub: "user-1" });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/analytics", () => {
  it("401 anonymous", async () => {
    const res = await request(app).get("/api/v1/analytics/overview");
    expect(res.status).toBe(401);
  });

  it("200 overview aggregates counts", async () => {
    prisma.user.count.mockResolvedValueOnce(50);
    prisma.userRole.count.mockResolvedValueOnce(40);
    prisma.event.count.mockResolvedValueOnce(5);
    prisma.job.count.mockResolvedValueOnce(8);
    prisma.achievement.count.mockResolvedValueOnce(3);
    prisma.donation.aggregate.mockResolvedValueOnce({
      _sum: { amount: 12000 },
      _count: 7,
    } as any);
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(50);
    expect(res.body.totalDonationsAmount).toBe(12000);
  });

  it("200 alumniByYear sorts ascending", async () => {
    prisma.profile.groupBy.mockResolvedValueOnce([
      { graduationYear: 2022, _count: { _all: 3 } } as any,
      { graduationYear: 2020, _count: { _all: 5 } } as any,
    ]);
    const res = await request(app)
      .get("/api/v1/analytics/alumni-by-year")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body[0].year).toBe(2020);
  });

  it("403 non-admin cannot hit /admin/overview", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/admin/overview")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin overview returns pending counters", async () => {
    prisma.user.count.mockResolvedValueOnce(2);
    prisma.event.count.mockResolvedValueOnce(1);
    prisma.job.count.mockResolvedValueOnce(0);
    prisma.achievement.count.mockResolvedValueOnce(4);
    const res = await request(app)
      .get("/api/v1/analytics/admin/overview")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.pendingAchievements).toBe(4);
  });
});