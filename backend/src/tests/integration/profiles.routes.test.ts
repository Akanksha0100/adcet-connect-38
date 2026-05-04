/**
 * Integration tests for /api/v1/profiles. The /me routes don't require
 * approval (so even pending users can edit their profile), but reading
 * another user's profile is gated by requireApproved.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const token = makeToken({ sub: "user-1" });

describe("/profiles/me", () => {
  it("401 anonymous", async () => {
    const res = await request(app).get("/api/v1/profiles/me");
    expect(res.status).toBe(401);
  });

  it("404 when profile row missing", async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(404);
  });

  it("200 returns profile", async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ id: "p1", userId: "user-1" } as any);
    const res = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
  });

  it("422 PATCH with bad URL", async () => {
    const res = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", bearer(token))
      .send({ linkedinUrl: "ftp://nope" });
    expect(res.status).toBe(422);
  });

  it("200 PATCH upserts", async () => {
    prisma.profile.upsert.mockResolvedValueOnce({ id: "p1" } as any);
    const res = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", bearer(token))
      .send({ city: "Pune" });
    expect(res.status).toBe(200);
  });
});

describe("/profiles/:userId", () => {
  it("403 when caller is not APPROVED", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", status: "PENDING" } as any);
    const res = await request(app)
      .get("/api/v1/profiles/u-other")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(403);
  });

  it("404 when profile is missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", status: "APPROVED" } as any);
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/profiles/u-other")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(404);
  });
});

describe("/profiles/me/experiences & educations", () => {
  it("422 with missing fields on experience", async () => {
    const res = await request(app)
      .post("/api/v1/profiles/me/experiences")
      .set("Authorization", bearer(token))
      .send({ company: "Acme" });
    expect(res.status).toBe(422);
  });

  it("404 add experience when profile missing", async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/profiles/me/experiences")
      .set("Authorization", bearer(token))
      .send({
        company: "Acme",
        title: "Eng",
        startDate: new Date().toISOString(),
      });
    expect(res.status).toBe(404);
  });

  it("422 add education with year out of range", async () => {
    const res = await request(app)
      .post("/api/v1/profiles/me/educations")
      .set("Authorization", bearer(token))
      .send({ institution: "X", degree: "BE", startYear: 1700 });
    expect(res.status).toBe(422);
  });

  it("422 setSkills with too many entries", async () => {
    const skills = Array.from({ length: 51 }, (_, i) => `s${i}`);
    const res = await request(app)
      .put("/api/v1/profiles/me/skills")
      .set("Authorization", bearer(token))
      .send({ skills });
    expect(res.status).toBe(422);
  });
});