/**
 * Integration tests for /api/v1/alumni — directory search.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const token = makeToken({ sub: "user-1" });

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/alumni", () => {
  it("401 anonymous", async () => {
    const res = await request(app).get("/api/v1/alumni");
    expect(res.status).toBe(401);
  });

  it("403 when user is PENDING", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", status: "PENDING" } as any);
    const res = await request(app).get("/api/v1/alumni").set("Authorization", bearer(token));
    expect(res.status).toBe(403);
  });

  it("422 when graduationYear is non-numeric garbage", async () => {
    const res = await request(app)
      .get("/api/v1/alumni?graduationYear=notanumber")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(422);
  });

  it("200 returns search results", async () => {
    prisma.profile.findMany.mockResolvedValueOnce([
      { id: "p1", user: { id: "u1", firstName: "A", lastName: "B" } } as any,
    ]);
    prisma.profile.count.mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/alumni?q=eng&city=Pune")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("free text searches names and companies — never department or batch", async () => {
    prisma.profile.findMany.mockResolvedValueOnce([]);
    prisma.profile.count.mockResolvedValueOnce(0);
    await request(app).get("/api/v1/alumni?q=asha%20infosys").set("Authorization", bearer(token));

    const where = (prisma.profile.findMany.mock.calls[0][0] as any).where;
    // One clause per word, so a full name has to match on both halves.
    expect(where.AND).toHaveLength(2);
    for (const clause of where.AND) {
      const fields = clause.OR.map((o: any) => Object.keys(o.user ?? o)[0]);
      expect(fields).toEqual(["firstName", "lastName", "currentCompany"]);
    }
    expect(JSON.stringify(where.AND)).not.toContain("department");
    expect(JSON.stringify(where.AND)).not.toContain("graduationYear");
  });

  it("multi-select filters OR within a filter and AND across them", async () => {
    prisma.profile.findMany.mockResolvedValueOnce([]);
    prisma.profile.count.mockResolvedValueOnce(0);
    await request(app)
      .get("/api/v1/alumni?departments=Civil%20Engineering,Food%20Technology&graduationYears=2019,2020")
      .set("Authorization", bearer(token));

    const where = (prisma.profile.findMany.mock.calls[0][0] as any).where;
    expect(where.department).toEqual({ in: ["Civil Engineering", "Food Technology"] });
    expect(where.graduationYear).toEqual({ in: [2019, 2020] });
  });

  it("422 when a graduation year in the multi-select is garbage", async () => {
    const res = await request(app)
      .get("/api/v1/alumni?graduationYears=2019,nope")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(422);
  });
});