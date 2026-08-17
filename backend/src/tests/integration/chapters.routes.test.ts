/**
 * Chapter route entitlements.
 *
 * The portal gained a Chapters page for members, so the member roster opened up
 * from admin-only to any approved member. These tests pin the boundary that
 * change created: members may look, may answer an invitation addressed to them,
 * and may touch nothing else — and email addresses stay on the admin side of
 * the line.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const memberToken = makeToken({ sub: "member-1", roles: ["ALUMNI"] });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

const CHAPTER = { id: "c1", slug: "pune", name: "Pune Chapter", isActive: true };

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "member-1", status: "APPROVED" } as any);
  prisma.chapter.findUnique.mockResolvedValue(CHAPTER as any);
  prisma.profile.findMany.mockResolvedValue([]);
  prisma.profile.count.mockResolvedValue(0);
});

describe("GET /chapters/:id/members", () => {
  it("401s anonymously", async () => {
    const res = await request(app).get("/api/v1/chapters/c1/members");
    expect(res.status).toBe(401);
  });

  it("lets an approved member read the roster", async () => {
    const res = await request(app)
      .get("/api/v1/chapters/c1/members")
      .set("Authorization", bearer(memberToken));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("403s a member whose account is not approved yet", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "member-1", status: "PENDING" } as any);

    const res = await request(app)
      .get("/api/v1/chapters/c1/members")
      .set("Authorization", bearer(memberToken));

    expect(res.status).toBe(403);
  });

  it("does not query member emails for a non-admin", async () => {
    await request(app).get("/api/v1/chapters/c1/members").set("Authorization", bearer(memberToken));

    const select = (prisma.profile.findMany.mock.calls.at(-1)![0] as any).select.user.select;
    expect(select.email).toBe(false);
  });

  it("does query member emails for an admin", async () => {
    await request(app).get("/api/v1/chapters/c1/members").set("Authorization", bearer(adminToken));

    const select = (prisma.profile.findMany.mock.calls.at(-1)![0] as any).select.user.select;
    expect(select.email).toBe(true);
  });
});

describe("chapters stay read-only for members", () => {
  /**
   * Every mutating route, with the payload each expects. Each row must carry a
   * body even where the verb ignores one — a row shorter than the callback's
   * arity makes `it.each` pass Jest's `done` in the gap, which then goes to
   * `.send()` and hangs the suite until it times out.
   */
  const writes: [string, string, Record<string, unknown>][] = [
    ["post", "/api/v1/chapters", { name: "Rogue Chapter" }],
    ["patch", "/api/v1/chapters/c1", { name: "Renamed" }],
    ["delete", "/api/v1/chapters/c1", {}],
    ["post", "/api/v1/chapters/c1/invitations", { userId: "u9" }],
    ["delete", "/api/v1/chapters/c1/members/u9", {}],
  ];

  it.each(writes)("403s an approved member on %s %s", async (method, path, body) => {
    const res = await (request(app) as any)
      [method](path)
      .set("Authorization", bearer(memberToken))
      .send(body);

    // Looking is allowed, and so is answering an invitation addressed to them
    // (below) — nothing else. A member cannot create a chapter, invite anybody
    // or put themselves in one uninvited.
    expect(res.status).toBe(403);
  });
});

/**
 * The one write a member does own: their own answer to an invitation. The
 * portal's Chapters page posts here, and the emailed one-click links reach the
 * same service — so an invitation is answerable even when the mail never lands.
 */
describe("POST /chapters/invitations/:id/respond", () => {
  const invitation = {
    id: "inv-1",
    chapterId: "c1",
    userId: "member-1",
    status: "PENDING",
    chapter: { ...CHAPTER, city: null, blurb: null, accent: null },
    invitedBy: { firstName: "Asha", lastName: "Rao" },
  };

  beforeEach(() => {
    prisma.chapterInvitation.findUnique.mockResolvedValue(invitation as any);
    prisma.chapterInvitation.update.mockResolvedValue({ ...invitation, status: "ACCEPTED" } as any);
    prisma.profile.upsert.mockResolvedValue({} as any);
  });

  it("lets the invitee accept, which makes them a member", async () => {
    const res = await request(app)
      .post("/api/v1/chapters/invitations/inv-1/respond")
      .set("Authorization", bearer(memberToken))
      .send({ response: "ACCEPT" });

    expect(res.status).toBe(200);
    // Membership is a single field on the profile — accepting sets it.
    expect(prisma.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "member-1" }, update: { chapterId: "c1" } }),
    );
  });

  it("403s somebody answering another person's invitation", async () => {
    prisma.chapterInvitation.findUnique.mockResolvedValue({ ...invitation, userId: "someone-else" } as any);

    const res = await request(app)
      .post("/api/v1/chapters/invitations/inv-1/respond")
      .set("Authorization", bearer(memberToken))
      .send({ response: "ACCEPT" });

    expect(res.status).toBe(403);
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });
});

describe("GET /chapters", () => {
  it("returns the office's order, not the database's default", async () => {
    prisma.chapter.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/chapters");

    expect((prisma.chapter.findMany.mock.calls.at(-1)![0] as any).orderBy).toEqual([
      { isActive: "desc" },
      { sortOrder: "asc" },
      { name: "asc" },
    ]);
  });
});
