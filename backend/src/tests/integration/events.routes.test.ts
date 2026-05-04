/**
 * Integration tests for /api/v1/events. Mirrors the jobs flow: list/get/create/
 * update/delete with RBAC + ownership, RSVP upsert, and admin moderation.
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
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/events list & detail", () => {
  it("200 list with pagination meta", async () => {
    prisma.event.findMany.mockResolvedValueOnce([{ id: "e1", title: "Meetup" } as any]);
    prisma.event.count.mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/events")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it("404 detail when event missing", async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/events/missing")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });
});

describe("create / update / delete", () => {
  it("422 when title is too short", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Authorization", bearer(userToken))
      .send({ title: "x", description: "shortdesc", startsAt: new Date().toISOString() });
    expect(res.status).toBe(422);
  });

  it("201 creates an event", async () => {
    prisma.event.create.mockResolvedValueOnce({ id: "e2" } as any);
    const res = await request(app)
      .post("/api/v1/events")
      .set("Authorization", bearer(userToken))
      .send({
        title: "Reunion",
        description: "Annual meet of alumni from class of 2020.",
        startsAt: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
  });

  it("403 when patching someone else's event", async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ id: "e1", createdById: "u-other" } as any);
    const res = await request(app)
      .patch("/api/v1/events/e1")
      .set("Authorization", bearer(userToken))
      .send({ title: "Hijack attempt" });
    expect(res.status).toBe(403);
  });

  it("404 deleting a missing event", async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .delete("/api/v1/events/missing")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });
});

describe("RSVP", () => {
  it("422 with an invalid rsvp status", async () => {
    const res = await request(app)
      .post("/api/v1/events/e1/rsvp")
      .set("Authorization", bearer(userToken))
      .send({ status: "PROBABLY" });
    expect(res.status).toBe(422);
  });

  it("200 upserts the rsvp", async () => {
    prisma.eventRsvp.upsert.mockResolvedValueOnce({ id: "r1" } as any);
    const res = await request(app)
      .post("/api/v1/events/e1/rsvp")
      .set("Authorization", bearer(userToken))
      .send({ status: "GOING" });
    expect(res.status).toBe(200);
  });
});

describe("admin moderation & rsvps list", () => {
  it("403 when non-admin tries to list rsvps", async () => {
    const res = await request(app)
      .get("/api/v1/events/e1/rsvps")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin moderates with REJECTED + reason", async () => {
    prisma.event.update.mockResolvedValueOnce({
      id: "e1",
      title: "Spam",
      createdById: "user-1",
    } as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);
    const res = await request(app)
      .post("/api/v1/events/e1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "REJECTED", reason: "Looks like spam" });
    expect(res.status).toBe(200);
  });
});