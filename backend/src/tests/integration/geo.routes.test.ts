/**
 * Integration tests for /api/v1/geo. All endpoints require an APPROVED user.
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

describe("/geo", () => {
  it("401 anonymous", async () => {
    const res = await request(app).get("/api/v1/geo/cities");
    expect(res.status).toBe(401);
  });

  it("200 cities groups by city desc by count", async () => {
    prisma.profile.groupBy.mockResolvedValueOnce([
      { city: "Pune", _count: { _all: 5 } } as any,
      { city: "Mumbai", _count: { _all: 10 } } as any,
      { city: null, _count: { _all: 1 } } as any,
    ]);
    const res = await request(app).get("/api/v1/geo/cities").set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body[0].city).toBe("Mumbai");
    expect(res.body).toHaveLength(2); // null filtered
  });

  it("200 companies", async () => {
    prisma.profile.groupBy.mockResolvedValueOnce([
      { currentCompany: "Acme", _count: { _all: 3 } } as any,
    ]);
    const res = await request(app)
      .get("/api/v1/geo/companies")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body[0].company).toBe("Acme");
  });

  it("200 breakdown nests companies under cities", async () => {
    prisma.profile.findMany.mockResolvedValueOnce([
      { city: "Pune", currentCompany: "Acme" } as any,
      { city: "Pune", currentCompany: "Acme" } as any,
      { city: "Pune", currentCompany: "Beta" } as any,
    ]);
    const res = await request(app)
      .get("/api/v1/geo/breakdown")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body[0].city).toBe("Pune");
    expect(res.body[0].totalAlumni).toBe(3);
    expect(res.body[0].companies[0].company).toBe("Acme");
    expect(res.body[0].companies[0].count).toBe(2);
  });
});