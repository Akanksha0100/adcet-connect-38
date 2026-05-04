/**
 * Integration tests for /api/v1/content (News, Resources, Support, Sections).
 * Public read endpoints; admin write/delete; support submission allows
 * anonymous (`optionalAuth`).
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

describe("News", () => {
  it("200 public listing", async () => {
    prisma.newsItem.findMany.mockResolvedValueOnce([{ id: "n1", title: "Hello" } as any]);
    prisma.newsItem.count.mockResolvedValueOnce(1);
    const res = await request(app).get("/api/v1/content/news");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("401 unauthenticated create", async () => {
    const res = await request(app)
      .post("/api/v1/content/news")
      .send({ title: "X", body: "yyy" });
    expect(res.status).toBe(401);
  });

  it("403 non-admin create", async () => {
    const res = await request(app)
      .post("/api/v1/content/news")
      .set("Authorization", bearer(userToken))
      .send({ title: "X", body: "yyy" });
    expect(res.status).toBe(403);
  });

  it("422 admin create with invalid link URL", async () => {
    const res = await request(app)
      .post("/api/v1/content/news")
      .set("Authorization", bearer(adminToken))
      .send({ title: "ABCD", body: "Body content here", link: "not-a-url" });
    expect(res.status).toBe(422);
  });

  it("201 admin creates news", async () => {
    prisma.newsItem.create.mockResolvedValueOnce({ id: "n1" } as any);
    const res = await request(app)
      .post("/api/v1/content/news")
      .set("Authorization", bearer(adminToken))
      .send({ title: "Hello", body: "Body content here" });
    expect(res.status).toBe(201);
  });

  it("404 patching missing news", async () => {
    prisma.newsItem.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .patch("/api/v1/content/news/missing")
      .set("Authorization", bearer(adminToken))
      .send({ title: "New title" });
    expect(res.status).toBe(404);
  });

  it("204 delete", async () => {
    prisma.newsItem.delete.mockResolvedValueOnce({} as any);
    const res = await request(app)
      .delete("/api/v1/content/news/n1")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(204);
  });
});

describe("Resources", () => {
  it("200 public list", async () => {
    prisma.resourceItem.findMany.mockResolvedValueOnce([]);
    prisma.resourceItem.count.mockResolvedValueOnce(0);
    const res = await request(app).get("/api/v1/content/resources");
    expect(res.status).toBe(200);
  });

  it("403 non-admin create", async () => {
    const res = await request(app)
      .post("/api/v1/content/resources")
      .set("Authorization", bearer(userToken))
      .send({ title: "Guide", body: "Some guide body" });
    expect(res.status).toBe(403);
  });

  it("201 admin create", async () => {
    prisma.resourceItem.create.mockResolvedValueOnce({ id: "r1" } as any);
    const res = await request(app)
      .post("/api/v1/content/resources")
      .set("Authorization", bearer(adminToken))
      .send({ title: "Guide", body: "Some guide body" });
    expect(res.status).toBe(201);
  });
});

describe("Support", () => {
  it("422 missing email on submit", async () => {
    const res = await request(app)
      .post("/api/v1/content/support")
      .send({ name: "Bob", message: "Hello there" });
    expect(res.status).toBe(422);
  });

  it("201 anonymous submit", async () => {
    prisma.supportMessage.create.mockResolvedValueOnce({ id: "sm1" } as any);
    const res = await request(app)
      .post("/api/v1/content/support")
      .send({ name: "Bob", email: "bob@example.com", message: "Hello there" });
    expect(res.status).toBe(201);
  });

  it("403 non-admin cannot list inbox", async () => {
    const res = await request(app)
      .get("/api/v1/content/support")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin lists inbox", async () => {
    prisma.supportMessage.findMany.mockResolvedValueOnce([]);
    prisma.supportMessage.count.mockResolvedValueOnce(0);
    const res = await request(app)
      .get("/api/v1/content/support")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
  });

  it("404 resolving missing message", async () => {
    prisma.supportMessage.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .patch("/api/v1/content/support/missing")
      .set("Authorization", bearer(adminToken))
      .send({ resolved: true });
    expect(res.status).toBe(404);
  });
});

describe("Site sections", () => {
  it("200 public list", async () => {
    prisma.siteSection.findMany.mockResolvedValueOnce([{ key: "about" } as any]);
    const res = await request(app).get("/api/v1/content/sections");
    expect(res.status).toBe(200);
  });

  it("200 single section returns null when missing", async () => {
    prisma.siteSection.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get("/api/v1/content/sections/about");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("403 non-admin upsert", async () => {
    const res = await request(app)
      .put("/api/v1/content/sections/about")
      .set("Authorization", bearer(userToken))
      .send({ title: "About", body: "Content" });
    expect(res.status).toBe(403);
  });

  it("200 admin upsert", async () => {
    prisma.siteSection.upsert.mockResolvedValueOnce({ key: "about" } as any);
    const res = await request(app)
      .put("/api/v1/content/sections/about")
      .set("Authorization", bearer(adminToken))
      .send({ title: "About", body: "Content" });
    expect(res.status).toBe(200);
  });
});