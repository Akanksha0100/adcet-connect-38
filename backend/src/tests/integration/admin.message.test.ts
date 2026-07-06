/**
 * Integration test for the admin → user direct-message endpoint.
 * Verifies RBAC, validation, and the notification side effect.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));
const sendEmail = jest.fn(async () => undefined);
const sendBulkEmails = jest.fn(async () => undefined);
jest.unstable_mockModule("../../lib/mailer.js", () => ({ sendEmail, sendBulkEmails }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });
const userToken = makeToken({ sub: "user-1" });

describe("POST /admin/users/:id/message", () => {
  it("403 when caller is not admin", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users/u1/message")
      .set("Authorization", bearer(userToken))
      .send({ subject: "Hi", body: "Hello" });
    expect(res.status).toBe(403);
  });

  it("422 when subject/body missing", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users/u1/message")
      .set("Authorization", bearer(adminToken))
      .send({});
    expect(res.status).toBe(422);
  });

  it("404 when recipient missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/message")
      .set("Authorization", bearer(adminToken))
      .send({ subject: "Hi", body: "Hello there" });
    expect(res.status).toBe(404);
  });

  it("201 persists notification and emails when prefs allow", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "u@x" } as any);
    prisma.notification.create.mockResolvedValueOnce({ id: "n1" } as any);
    prisma.userPreferences.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/admin/users/u1/message")
      .set("Authorization", bearer(adminToken))
      .send({ subject: "Welcome", body: "Glad you joined." });
    expect(res.status).toBe(201);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "admin.message", userId: "u1", title: "Welcome" }),
      }),
    );
    expect(sendEmail).toHaveBeenCalled();
  });
});