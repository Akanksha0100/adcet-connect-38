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
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

/** A key as `buildObjectKey` produces it: `<scope>/<ownerId>/<uuid>-<name>`. */
const key = (scope: string, owner: string, name = "file.pdf") => `${scope}/${owner}/abc-${name}`;

beforeEach(() => jest.clearAllMocks());

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

/**
 * An object key is a string in a request body, not a capability. Before these
 * checks existed, any signed-in member could name someone else's key and get a
 * download URL for it — or delete it outright.
 */
describe("/uploads — key authorisation", () => {
  describe("presign-download", () => {
    it("403 reading another member's resume", async () => {
      prisma.jobApplication.findFirst.mockResolvedValueOnce(null as any);
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(token))
        .send({ key: key("resume", "victim-9", "cv.pdf") });
      expect(res.status).toBe(403);
    });

    it("403 reading another member's donation receipt", async () => {
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(token))
        .send({ key: key("receipt", "victim-9", "receipt.pdf") });
      expect(res.status).toBe(403);
    });

    it("200 reading your own resume", async () => {
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(token))
        .send({ key: key("resume", "user-1", "cv.pdf") });
      expect(res.status).toBe(200);
    });

    it("200 when the caller posted the job the resume was submitted to", async () => {
      prisma.jobApplication.findFirst.mockResolvedValueOnce({ id: "app-1" } as any);
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(token))
        .send({ key: key("resume", "applicant-2", "cv.pdf") });
      expect(res.status).toBe(200);
      expect(prisma.jobApplication.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ job: { createdById: "user-1" } }),
        }),
      );
    });

    it("200 for a public scope owned by someone else — those URLs are public anyway", async () => {
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(token))
        .send({ key: key("event-attachment", "organiser-3", "agenda.pdf") });
      expect(res.status).toBe(200);
    });

    it("200 for an admin reading anything", async () => {
      const res = await request(app)
        .post("/api/v1/uploads/presign-download")
        .set("Authorization", bearer(adminToken))
        .send({ key: key("receipt", "victim-9", "receipt.pdf") });
      expect(res.status).toBe(200);
    });
  });

  describe("delete", () => {
    it("403 deleting an object owned by someone else", async () => {
      const res = await request(app)
        .delete("/api/v1/uploads")
        .set("Authorization", bearer(token))
        .send({ key: key("avatar", "victim-9", "face.png") });
      expect(res.status).toBe(403);
    });

    it("204 deleting your own object", async () => {
      const res = await request(app)
        .delete("/api/v1/uploads")
        .set("Authorization", bearer(token))
        .send({ key: key("avatar", "user-1", "face.png") });
      expect(res.status).toBe(204);
    });

    it("204 for an admin deleting anyone's object", async () => {
      const res = await request(app)
        .delete("/api/v1/uploads")
        .set("Authorization", bearer(adminToken))
        .send({ key: key("gallery", "someone", "photo.jpg") });
      expect(res.status).toBe(204);
    });
  });

  /**
   * `LocalStorage` used to `path.join(root, key)`, so a `..` in the key walked
   * straight out of the uploads directory — an authenticated arbitrary file
   * delete. Keys that aren't `<scope>/<owner>/<name>` are refused outright.
   */
  it.each([
    "../../../backend/src/server.ts",
    "avatar/user-1/../../../../etc/passwd",
    "/etc/passwd",
    "avatar\\user-1\\x.png",
    "not-a-scope/user-1/x.png",
    "avatar/user-1",
  ])("404 for the malformed or traversing key %s", async (badKey) => {
    const res = await request(app)
      .delete("/api/v1/uploads")
      .set("Authorization", bearer(token))
      .send({ key: badKey });
    expect(res.status).toBe(404);
  });
});