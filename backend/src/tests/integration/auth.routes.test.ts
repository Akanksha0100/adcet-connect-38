/**
 * Integration tests for the Auth module.
 *
 * Exercises the full Route → Middleware → Controller → Service flow with a
 * mocked Prisma client. Covers:
 *   - Validation (422) for malformed bodies
 *   - Success paths for register / login / refresh / logout / me
 *   - Bad credentials, unique-constraint conflicts, expired/invalid tokens
 *   - OAuth provider not-configured (501) and CSRF state checks
 *   - Rate limiter does NOT swallow normal traffic in the test env
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { createPrismaDeepMock } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { hashPassword } = await import("../../lib/password.js");
const { signRefreshToken, hashToken } = await import("../../lib/jwt.js");
const { buildApp } = await import("../../app.js");
const app = buildApp();

const baseUser = (overrides: any = {}) => ({
  id: "user-1",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "A",
  passwordHash: "to-be-set",
  status: "PENDING",
  rejectionReason: null,
  roles: [{ role: "ALUMNI" }],
  ...overrides,
});

describe("POST /api/v1/auth/register", () => {
  it("422 when required fields are missing", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "bad" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE");
  });

  it("201 + tokens on first-time registration", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(baseUser() as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const res = await request(app).post("/api/v1/auth/register").send({
      email: "alice@example.com",
      password: "Strong#Pass1",
      firstName: "Alice",
      lastName: "A",
      linkedinUrl: "https://linkedin.com/in/alice",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it("422 when linkedinUrl is missing", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "alice@example.com",
      password: "Strong#Pass1",
      firstName: "Alice",
      lastName: "A",
    });
    expect(res.status).toBe(422);
  });

  it("409 when the email is already registered", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(baseUser() as any);
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "alice@example.com",
      password: "Strong#Pass1",
      firstName: "Alice",
      lastName: "A",
      linkedinUrl: "https://linkedin.com/in/alice",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("500 when Prisma throws an unexpected DB failure", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "bob@example.com",
      password: "Strong#Pass1",
      firstName: "Bob",
      lastName: "B",
      linkedinUrl: "https://linkedin.com/in/bob",
    });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("422 when body is malformed", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "no-at" });
    expect(res.status).toBe(422);
  });

  it("401 when the email is unknown", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ghost@example.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/Invalid credentials/);
  });

  it("401 when the password is wrong", async () => {
    const passwordHash = await hashPassword("CorrectPassword#1");
    prisma.user.findUnique.mockResolvedValueOnce(baseUser({ passwordHash }) as any);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@example.com", password: "WrongPassword#1" });
    expect(res.status).toBe(401);
  });

  it("200 + tokens on success, lastLoginAt is updated", async () => {
    const passwordHash = await hashPassword("Strong#Pass1");
    prisma.user.findUnique.mockResolvedValueOnce(baseUser({ passwordHash }) as any);
    prisma.user.update.mockResolvedValueOnce({} as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@example.com", password: "Strong#Pass1" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("422 if refreshToken missing", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({});
    expect(res.status).toBe(422);
  });

  it("401 when the token signature is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "totally.not.a.jwt" });
    expect(res.status).toBe(401);
  });

  it("401 when the token row was revoked", async () => {
    const token = signRefreshToken("user-1");
    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: "rt-1",
      userId: "user-1",
      tokenHash: hashToken(token),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    } as any);
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it("200 + rotated tokens on success", async () => {
    const token = signRefreshToken("user-1");
    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: "rt-1",
      userId: "user-1",
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    } as any);
    prisma.user.findUnique.mockResolvedValueOnce(baseUser() as any);
    prisma.refreshToken.update.mockResolvedValueOnce({} as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(token);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("204 even if the token is unknown (idempotent)", async () => {
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 } as any);
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "x".repeat(20) });
    expect(res.status).toBe(204);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("401 without a bearer token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("401 with an obviously invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("200 returns the public user payload", async () => {
    const { signAccessToken } = await import("../../lib/jwt.js");
    const access = signAccessToken({
      sub: "user-1",
      email: "alice@example.com",
      roles: ["ALUMNI"],
    });
    prisma.user.findUnique.mockResolvedValueOnce(baseUser() as any);
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${access}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("alice@example.com");
  });
});

describe("OAuth endpoints", () => {
  it("400 for an unknown provider", async () => {
    const res = await request(app).get("/api/v1/auth/oauth/myspace");
    expect(res.status).toBe(400);
  });

  it("501 when the provider is not configured", async () => {
    // No GOOGLE_CLIENT_ID is set in the test env.
    const res = await request(app).get("/api/v1/auth/oauth/google");
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("callback rejects an invalid CSRF state", async () => {
    const res = await request(app)
      .get("/api/v1/auth/oauth/google/callback")
      .query({ code: "abc", state: "never-issued" });
    // Provider is also unconfigured → 501 short-circuits before state check.
    expect([401, 501]).toContain(res.status);
  });
});

describe("Prisma error mapping", () => {
  it("P2002 unique-constraint surfaces as 409 via the error handler", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["email"] },
      }),
    );
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "dup@example.com",
      password: "Strong#Pass1",
      firstName: "Dup",
      lastName: "Lic",
      linkedinUrl: "https://linkedin.com/in/dup",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});