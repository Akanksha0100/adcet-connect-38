/**
 * Integration smoke test: validates that the full Express app boots inside
 * Jest's ESM VM with the Prisma module mocked, and that the unauthenticated
 * /health endpoint responds.
 *
 * If this test fails, every other integration test will too — start here.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

describe("integration: health & 404", () => {
  it("GET /api/v1/health → 200 ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("unknown route → 404 with structured error", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});