/**
 * Integration tests for /api/v1/notifications.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const token = makeToken({ sub: "user-1" });

describe("/notifications", () => {
  it("401 anonymous", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });

  it("200 list returns items, pagination & unread", async () => {
    prisma.notification.findMany.mockResolvedValueOnce([{ id: "n1" } as any]);
    prisma.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(1);
  });

  it("200 unread-count", async () => {
    prisma.notification.count.mockResolvedValueOnce(3);
    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(3);
  });

  it("204 mark single read", async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 1 } as any);
    const res = await request(app)
      .post("/api/v1/notifications/n1/read")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(204);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n1", userId: "user-1" } }),
    );
  });

  it("204 mark all read", async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 5 } as any);
    const res = await request(app)
      .post("/api/v1/notifications/read-all")
      .set("Authorization", bearer(token));
    expect(res.status).toBe(204);
  });
});