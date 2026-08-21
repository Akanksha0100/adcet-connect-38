/**
 * Integration tests for /api/v1/achievements.
 * Mirrors jobs/events: list, get-by-id, create/update/delete, ownership,
 * admin moderation with reasons.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const userToken = makeToken({ sub: "user-1" });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/achievements", () => {
  it("401 anonymous list", async () => {
    const res = await request(app).get("/api/v1/achievements");
    expect(res.status).toBe(401);
  });

  it("200 list", async () => {
    prisma.achievement.findMany.mockResolvedValueOnce([{ id: "a1" } as any]);
    prisma.achievement.count.mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/achievements")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
  });

  it("404 detail when missing", async () => {
    prisma.achievement.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/achievements/missing")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });

  it("422 create with empty title", async () => {
    const res = await request(app)
      .post("/api/v1/achievements")
      .set("Authorization", bearer(userToken))
      .send({ title: "", description: "Some desc" });
    expect(res.status).toBe(422);
  });

  it("201 create", async () => {
    prisma.achievement.create.mockResolvedValueOnce({ id: "a2" } as any);
    const res = await request(app)
      .post("/api/v1/achievements")
      .set("Authorization", bearer(userToken))
      .send({ title: "Won Hackathon", description: "First place at XYZ" });
    expect(res.status).toBe(201);
  });

  /**
   * Stored XSS. `link` is rendered as an `<a href>` on the public achievement
   * page and in the admin moderation queue, so a non-http scheme stored here is
   * script that runs in a reader's — or an admin's — browser. `httpUrl` in
   * `lib/urls.ts` is what blocks it; `z.string().url()` did not.
   */
  it.each([
    "javascript:alert(document.cookie)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("422 create with a %s link, and nothing is written", async (link) => {
    const res = await request(app)
      .post("/api/v1/achievements")
      .set("Authorization", bearer(userToken))
      .send({ title: "Won Hackathon", description: "First place at XYZ", link });
    expect(res.status).toBe(422);
    expect(prisma.achievement.create).not.toHaveBeenCalled();
  });

  it("422 when a hostile link is smuggled in through PATCH", async () => {
    const res = await request(app)
      .patch("/api/v1/achievements/a1")
      .set("Authorization", bearer(userToken))
      .send({ link: "javascript:alert(1)" });
    expect(res.status).toBe(422);
    expect(prisma.achievement.update).not.toHaveBeenCalled();
  });

  it("201 create with an ordinary https link", async () => {
    prisma.achievement.create.mockResolvedValueOnce({ id: "a3" } as any);
    const res = await request(app)
      .post("/api/v1/achievements")
      .set("Authorization", bearer(userToken))
      .send({ title: "Won Hackathon", description: "First place at XYZ", link: "https://news.example/x" });
    expect(res.status).toBe(201);
  });

  it("403 update someone else's achievement", async () => {
    prisma.achievement.findUnique.mockResolvedValueOnce({ id: "a1", userId: "u-other" } as any);
    const res = await request(app)
      .patch("/api/v1/achievements/a1")
      .set("Authorization", bearer(userToken))
      .send({ title: "Steal" });
    expect(res.status).toBe(403);
  });

  it("403 listPending for non-admin", async () => {
    const res = await request(app)
      .get("/api/v1/achievements/pending")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin moderates approve", async () => {
    prisma.achievement.update.mockResolvedValueOnce({
      id: "a1",
      title: "Won",
      description: "First place",
      userId: "user-1",
      user: { firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    } as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);
    prisma.siteSection.findUnique.mockResolvedValueOnce(null as any);
    const res = await request(app)
      .post("/api/v1/achievements/a1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(200);
  });
});