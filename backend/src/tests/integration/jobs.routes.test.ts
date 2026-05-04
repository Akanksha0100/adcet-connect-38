/**
 * Integration tests for /api/v1/jobs.
 *
 * Validates the full middleware stack:
 *   requireAuth → requireApproved → validate → controller → service.
 *
 * Covers: list filtering, detail 404, create/update/delete RBAC,
 * application upsert, admin moderation (approve + reject with reason),
 * pending-list admin gating, and validator failures.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const approvedUser = { id: "user-1", status: "APPROVED" } as any;
const userToken = makeToken({ sub: "user-1", roles: ["ALUMNI"] });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });
const otherToken = makeToken({ sub: "other-1", roles: ["ALUMNI"] });

// requireApproved hits prisma.user.findUnique on every request — set a
// default that returns an APPROVED user so we don't have to repeat it.
beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue(approvedUser);
});

describe("auth & approval gating", () => {
  it("401 without bearer", async () => {
    const res = await request(app).get("/api/v1/jobs");
    expect(res.status).toBe(401);
  });

  it("403 when the caller is not APPROVED", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", status: "PENDING" } as any);
    const res = await request(app).get("/api/v1/jobs").set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });
});

describe("GET /jobs", () => {
  it("422 when an unknown employmentType is supplied", async () => {
    const res = await request(app)
      .get("/api/v1/jobs?employmentType=BOGUS")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(422);
  });

  it("200 returns a paginated payload", async () => {
    prisma.job.findMany.mockResolvedValueOnce([{ id: "j1", title: "Eng" } as any]);
    prisma.job.count.mockResolvedValueOnce(1);
    const res = await request(app).get("/api/v1/jobs").set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe("GET /jobs/:id", () => {
  it("404 when the job does not exist", async () => {
    prisma.job.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/jobs/nonexistent")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });

  it("200 returns the job", async () => {
    prisma.job.findUnique.mockResolvedValueOnce({ id: "j1", title: "Engineer" } as any);
    const res = await request(app).get("/api/v1/jobs/j1").set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Engineer");
  });
});

describe("POST /jobs", () => {
  it("422 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", bearer(userToken))
      .send({ title: "x" });
    expect(res.status).toBe(422);
  });

  it("201 creates with createdById from the JWT", async () => {
    prisma.job.create.mockResolvedValueOnce({ id: "j2", title: "QA" } as any);
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", bearer(userToken))
      .send({
        title: "QA",
        company: "Acme",
        description: "Looking for a QA engineer with attention to detail.",
      });
    expect(res.status).toBe(201);
    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: "user-1" }) }),
    );
  });
});

describe("PATCH /jobs/:id", () => {
  it("403 when the caller is not the owner", async () => {
    prisma.job.findUnique.mockResolvedValueOnce({ id: "j1", createdById: "someone-else" } as any);
    const res = await request(app)
      .patch("/api/v1/jobs/j1")
      .set("Authorization", bearer(otherToken))
      .send({ title: "Hijack" });
    expect(res.status).toBe(403);
  });

  it("200 when admin updates someone else's job", async () => {
    prisma.job.findUnique.mockResolvedValueOnce({ id: "j1", createdById: "user-1" } as any);
    prisma.job.update.mockResolvedValueOnce({ id: "j1", title: "Updated" } as any);
    const res = await request(app)
      .patch("/api/v1/jobs/j1")
      .set("Authorization", bearer(adminToken))
      .send({ title: "Updated" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /jobs/:id", () => {
  it("404 when the job is missing", async () => {
    prisma.job.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .delete("/api/v1/jobs/missing")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });
});

describe("POST /jobs/:id/apply", () => {
  it("201 upserts an application", async () => {
    prisma.jobApplication.upsert.mockResolvedValueOnce({ id: "app-1" } as any);
    const res = await request(app)
      .post("/api/v1/jobs/j1/apply")
      .set("Authorization", bearer(userToken))
      .send({ coverLetter: "Hi!" });
    expect(res.status).toBe(201);
  });
});

describe("admin-only routes", () => {
  it("403 when a non-admin hits /jobs/pending", async () => {
    const res = await request(app)
      .get("/api/v1/jobs/pending")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 when admin lists pending jobs", async () => {
    prisma.job.findMany.mockResolvedValueOnce([]);
    prisma.job.count.mockResolvedValueOnce(0);
    const res = await request(app)
      .get("/api/v1/jobs/pending")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
  });

  it("422 on moderate with an invalid status", async () => {
    const res = await request(app)
      .post("/api/v1/jobs/j1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "MAYBE" });
    expect(res.status).toBe(422);
  });

  it("200 approve notifies the creator", async () => {
    prisma.job.update.mockResolvedValueOnce({
      id: "j1",
      title: "QA",
      company: "Acme",
      createdById: "user-1",
    } as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);
    prisma.userPreferences.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/v1/jobs/j1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(200);
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it("200 reject persists rejectionReason on the job row", async () => {
    prisma.job.update.mockResolvedValueOnce({
      id: "j1",
      title: "QA",
      company: "Acme",
      createdById: "user-1",
      rejectionReason: "Off-topic",
    } as any);
    prisma.notification.create.mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post("/api/v1/jobs/j1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "REJECTED", reason: "Off-topic" });
    expect(res.status).toBe(200);
    expect(prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", rejectionReason: "Off-topic" }),
      }),
    );
  });
});