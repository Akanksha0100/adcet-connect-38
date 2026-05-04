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
});