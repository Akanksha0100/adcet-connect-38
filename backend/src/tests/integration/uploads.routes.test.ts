/**
 * Integration tests for /api/v1/uploads. Storage is the local-disk adapter
 * in test env, so presign returns a relative URL/key without hitting S3.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const token = makeToken({ sub: "user-1" });

describe("/uploads", () => {
  it("401 anonymous", async () => {
    const res = await request(app).post("/api/v1/uploads/presign").send({});
    expect(res.status).toBe(401);
  });

  it("422 with invalid scope", async () => {
    const res = await request(app)
      .post("/api/v1/uploads/presign")
      .set("Authorization", bearer(token))
      .send({ fileName: "a.png", contentType: "image/png", scope: "evil" });
    expect(res.status).toBe(422);
  });

  it("200 presign upload returns key + url", async () => {
    const res = await request(app)
      .post("/api/v1/uploads/presign")
      .set("Authorization", bearer(token))
      .send({ fileName: "a.png", contentType: "image/png", scope: "avatar" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("key");
  });

  it("422 presign-download missing key", async () => {
    const res = await request(app)
      .post("/api/v1/uploads/presign-download")
      .set("Authorization", bearer(token))
      .send({});
    expect(res.status).toBe(422);
  });
});