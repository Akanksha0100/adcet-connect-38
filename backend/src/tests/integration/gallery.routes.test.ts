/**
 * Integration tests for /api/v1/gallery — public album listing, admin writes.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });
const userToken = makeToken({ sub: "user-1", roles: ["ALUMNI"] });

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/gallery", () => {
  it("200 anonymous — visitors browse the gallery without signing in", async () => {
    prisma.galleryAlbum.findMany.mockResolvedValueOnce([]);
    const res = await request(app).get("/api/v1/gallery/albums");
    expect(res.status).toBe(200);
  });

  it("hides unpublished albums from anonymous visitors", async () => {
    prisma.galleryAlbum.findMany.mockResolvedValueOnce([]);
    await request(app).get("/api/v1/gallery/albums?includeUnpublished=true");
    expect((prisma.galleryAlbum.findMany.mock.calls[0][0] as any).where).toEqual({ isPublished: true });
  });

  it("hides unpublished albums from a signed-in non-admin too", async () => {
    prisma.galleryAlbum.findMany.mockResolvedValueOnce([]);
    await request(app)
      .get("/api/v1/gallery/albums?includeUnpublished=true")
      .set("Authorization", bearer(userToken));
    expect((prisma.galleryAlbum.findMany.mock.calls[0][0] as any).where).toEqual({ isPublished: true });
  });

  it("shows unpublished albums to an admin who asks", async () => {
    prisma.galleryAlbum.findMany.mockResolvedValueOnce([]);
    await request(app)
      .get("/api/v1/gallery/albums?includeUnpublished=true")
      .set("Authorization", bearer(adminToken));
    expect((prisma.galleryAlbum.findMany.mock.calls[0][0] as any).where).toEqual({});
  });

  it("403 non-admin create", async () => {
    const res = await request(app)
      .post("/api/v1/gallery/albums")
      .set("Authorization", bearer(userToken))
      .send({ title: "Chapter Meet" });
    expect(res.status).toBe(403);
  });

  it("201 admin create derives a slug from the title", async () => {
    prisma.galleryAlbum.findUnique.mockResolvedValueOnce(null);
    prisma.galleryAlbum.create.mockResolvedValueOnce({ id: "a1" } as any);
    const res = await request(app)
      .post("/api/v1/gallery/albums")
      .set("Authorization", bearer(adminToken))
      .send({ title: "Pune Chapter Meet", location: "Pune" });
    expect(res.status).toBe(201);
    expect((prisma.galleryAlbum.create.mock.calls[0][0] as any).data.slug).toBe("pune-chapter-meet");
  });

  it("suffixes the slug when the title repeats", async () => {
    prisma.galleryAlbum.findUnique
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);
    prisma.galleryAlbum.create.mockResolvedValueOnce({ id: "a2" } as any);
    await request(app)
      .post("/api/v1/gallery/albums")
      .set("Authorization", bearer(adminToken))
      .send({ title: "Pune Chapter Meet" });
    expect((prisma.galleryAlbum.create.mock.calls[0][0] as any).data.slug).toBe("pune-chapter-meet-2");
  });

  it("appends new photos after the ones already in the album", async () => {
    prisma.galleryAlbum.findUnique.mockResolvedValueOnce({ id: "a1" } as any);
    prisma.galleryPhoto.findFirst.mockResolvedValueOnce({ sortOrder: 4 } as any);
    prisma.galleryPhoto.createMany.mockResolvedValueOnce({ count: 2 } as any);
    prisma.galleryAlbum.findUnique.mockResolvedValueOnce({ id: "a1", photos: [] } as any);

    const res = await request(app)
      .post("/api/v1/gallery/albums/a1/photos")
      .set("Authorization", bearer(adminToken))
      .send({ imageKeys: ["gallery/a/1.jpg", "gallery/a/2.jpg"] });

    expect(res.status).toBe(201);
    expect((prisma.galleryPhoto.createMany.mock.calls[0][0] as any).data).toEqual([
      { albumId: "a1", imageKey: "gallery/a/1.jpg", sortOrder: 5 },
      { albumId: "a1", imageKey: "gallery/a/2.jpg", sortOrder: 6 },
    ]);
  });

  it("422 when a photo batch is empty", async () => {
    const res = await request(app)
      .post("/api/v1/gallery/albums/a1/photos")
      .set("Authorization", bearer(adminToken))
      .send({ imageKeys: [] });
    expect(res.status).toBe(422);
  });

  it("404 when adding photos to an album that does not exist", async () => {
    prisma.galleryAlbum.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/gallery/albums/nope/photos")
      .set("Authorization", bearer(adminToken))
      .send({ imageKeys: ["gallery/a/1.jpg"] });
    expect(res.status).toBe(404);
  });
});
