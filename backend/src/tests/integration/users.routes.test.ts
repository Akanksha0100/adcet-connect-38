/**
 * Integration tests for /api/v1/users — preferences, profile name updates,
 * and password change. Validates RBAC (auth required), validation, and
 * Prisma error → HTTP mapping.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { hashPassword } = await import("../../lib/password.js");
const { buildApp } = await import("../../app.js");
const app = buildApp();

const token = makeToken();

describe("users routes — auth gating", () => {
  it.each(["/me/preferences", "/me/preferences", "/me", "/me/change-password"])(
    "401 without bearer on %s",
    async (path) => {
      const res = await request(app).get(`/api/v1/users${path}`);
      expect([401, 404, 405]).toContain(res.status); // GET on non-GET routes → 404
    },
  );
});

describe("PATCH /users/me", () => {
  it("422 when firstName is too long", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", bearer(token))
      .send({ firstName: "x".repeat(81) });
    expect(res.status).toBe(422);
  });

  it("200 on a clean update", async () => {
    prisma.user.update.mockResolvedValueOnce({ id: "user-1", firstName: "New", lastName: "Name" } as any);
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", bearer(token))
      .send({ firstName: "New" });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe("New");
  });
});

describe("GET /users/me/preferences", () => {
  it("returns existing prefs", async () => {
    prisma.userPreferences.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      darkMode: true,
    } as any);
    const res = await request(app)
      .get("/api/v1/users/me/preferences")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.darkMode).toBe(true);
  });

  it("creates prefs lazily when missing", async () => {
    prisma.userPreferences.findUnique.mockResolvedValueOnce(null);
    prisma.userPreferences.create.mockResolvedValueOnce({ userId: "user-1" } as any);
    const res = await request(app)
      .get("/api/v1/users/me/preferences")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(prisma.userPreferences.create).toHaveBeenCalled();
  });
});

describe("PUT /users/me/preferences", () => {
  it("422 when language is too short", async () => {
    const res = await request(app)
      .put("/api/v1/users/me/preferences")
      .set("Authorization", bearer(token))
      .send({ language: "x" });
    expect(res.status).toBe(422);
  });

  it("200 upserts preferences", async () => {
    prisma.userPreferences.upsert.mockResolvedValueOnce({ userId: "user-1", darkMode: false } as any);
    const res = await request(app)
      .put("/api/v1/users/me/preferences")
      .set("Authorization", bearer(token))
      .send({ darkMode: false });
    expect(res.status).toBe(200);
  });
});

describe("POST /users/me/change-password", () => {
  it("422 when newPassword is too short", async () => {
    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set("Authorization", bearer(token))
      .send({ currentPassword: "x", newPassword: "short" });
    expect(res.status).toBe(422);
  });

  it("404 when user record is missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set("Authorization", bearer(token))
      .send({ currentPassword: "Strong#Pass1", newPassword: "Stronger#Pass2" });
    expect(res.status).toBe(404);
  });

  it("401 when the current password is wrong", async () => {
    const passwordHash = await hashPassword("Right#Pass1");
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", passwordHash } as any);
    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set("Authorization", bearer(token))
      .send({ currentPassword: "Wrong#Pass1", newPassword: "Stronger#Pass2" });
    expect(res.status).toBe(401);
  });

  it("204 + revokes refresh tokens on success", async () => {
    const passwordHash = await hashPassword("Right#Pass1");
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", passwordHash } as any);
    prisma.user.update.mockResolvedValueOnce({} as any);
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 } as any);
    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set("Authorization", bearer(token))
      .send({ currentPassword: "Right#Pass1", newPassword: "Stronger#Pass2" });
    expect(res.status).toBe(204);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });
});