/**
 * Chapters service tests.
 *
 * The rules worth protecting here are the product ones: a member belongs to
 * exactly one chapter at a time, archived chapters stop accepting members,
 * and a chapter can never be removed — only archived.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/chapters/chapters.service.js");

const chapterRow = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  slug: "pune",
  name: "Pune Chapter",
  blurb: null,
  accent: null,
  city: "Pune",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { members: 7 },
  ...over,
});

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  prismaMock.chapter.findMany.mockResolvedValue([]);
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("modules/chapters/service — list", () => {
  it("hides archived chapters by default", async () => {
    await svc.list();
    expect((prismaMock.chapter.findMany.mock.calls.at(-1)![0] as any).where).toEqual({ isActive: true });
  });

  it("includes archived chapters when asked", async () => {
    await svc.list({ includeInactive: true });
    expect((prismaMock.chapter.findMany.mock.calls.at(-1)![0] as any).where).toEqual({});
  });

  it("flattens the relation count into memberCount", async () => {
    prismaMock.chapter.findMany.mockResolvedValue([chapterRow()]);
    const { items } = await svc.list();
    expect(items[0].memberCount).toBe(7);
    expect(items[0]).not.toHaveProperty("_count");
  });

  it("counts only approved alumni as members", async () => {
    await svc.list();
    const include = (prismaMock.chapter.findMany.mock.calls.at(-1)![0] as any).include;
    expect(include._count.select.members.where).toEqual({
      user: { status: "APPROVED", roles: { some: { role: "ALUMNI" } } },
    });
  });
});

describe("modules/chapters/service — create", () => {
  it("derives a url-safe slug from the name", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(null);
    prismaMock.chapter.create.mockResolvedValue(chapterRow({ slug: "hyderabad" }));
    await svc.create("admin-1", { name: "Hyderabad Chapter!" });
    expect((prismaMock.chapter.create.mock.calls.at(-1)![0] as any).data.slug).toBe("hyderabad-chapter");
  });

  it("rejects a duplicate slug with 409", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    await expect(svc.create("admin-1", { name: "Pune Chapter" })).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.chapter.create).not.toHaveBeenCalled();
  });

  it("writes an audit log entry", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(null);
    prismaMock.chapter.create.mockResolvedValue(chapterRow());
    await svc.create("admin-1", { name: "Pune Chapter" });
    expect((prismaMock.auditLog.create.mock.calls.at(-1)![0] as any).data).toMatchObject({
      actorId: "admin-1",
      action: "chapter.create",
      entity: "Chapter",
    });
  });
});

describe("modules/chapters/service — update / archive", () => {
  it("archiving is an isActive flip, never a delete", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.chapter.update.mockResolvedValue(chapterRow({ isActive: false }));
    await svc.update("admin-1", "c1", { isActive: false });

    expect((prismaMock.chapter.update.mock.calls.at(-1)![0] as any).data).toEqual({ isActive: false });
    expect(prismaMock.chapter.delete).not.toHaveBeenCalled();
    expect(prismaMock.chapter.deleteMany).not.toHaveBeenCalled();
    expect((prismaMock.auditLog.create.mock.calls.at(-1)![0] as any).data.action).toBe("chapter.archive");
  });

  it("restoring an archived chapter is audited as a restore", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow({ isActive: false }));
    prismaMock.chapter.update.mockResolvedValue(chapterRow());
    await svc.update("admin-1", "c1", { isActive: true });
    expect((prismaMock.auditLog.create.mock.calls.at(-1)![0] as any).data.action).toBe("chapter.restore");
  });

  it("404s on an unknown chapter", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(null);
    await expect(svc.update("admin-1", "nope", { name: "X" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("modules/chapters/service — delete (empty chapters only)", () => {
  const empty = () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.profile.count.mockResolvedValue(0);
    prismaMock.event.count.mockResolvedValue(0);
    prismaMock.chapterInvitation.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.chapter.delete.mockResolvedValue(chapterRow());
  };

  it("deletes a chapter with no members and no events", async () => {
    empty();
    await svc.remove("admin-1", "c1");
    expect((prismaMock.chapter.delete.mock.calls.at(-1)![0] as any).where).toEqual({ id: "c1" });
    expect((prismaMock.auditLog.create.mock.calls.at(-1)![0] as any).data.action).toBe("chapter.delete");
  });

  it("refuses to delete a chapter that still has members", async () => {
    empty();
    prismaMock.profile.count.mockResolvedValue(4);
    await expect(svc.remove("admin-1", "c1")).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.chapter.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a chapter that still has events", async () => {
    empty();
    prismaMock.event.count.mockResolvedValue(2);
    await expect(svc.remove("admin-1", "c1")).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.chapter.delete).not.toHaveBeenCalled();
  });

  it("names what is blocking the delete and suggests archiving", async () => {
    empty();
    prismaMock.profile.count.mockResolvedValue(1);
    prismaMock.event.count.mockResolvedValue(3);
    await expect(svc.remove("admin-1", "c1")).rejects.toMatchObject({
      message: expect.stringContaining("1 member and 3 events"),
    });
    await expect(svc.remove("admin-1", "c1")).rejects.toMatchObject({
      message: expect.stringContaining("archive"),
    });
  });
});

describe("modules/chapters/service — invitations", () => {
  const alumnus = (over: Record<string, unknown> = {}) => ({
    id: "user-1",
    email: "alice@adcet.in",
    firstName: "Alice",
    lastName: "Patil",
    status: "APPROVED",
    roles: [{ role: "ALUMNI" }],
    profile: { chapterId: null, chapter: null },
    ...over,
  });
  const invitationRow = (over: Record<string, unknown> = {}) => ({
    id: "inv-1",
    chapterId: "c1",
    userId: "user-1",
    status: "PENDING",
    message: null,
    invitedById: "admin-1",
    chapter: { id: "c1", slug: "pune", name: "Pune Chapter", city: "Pune", blurb: null, accent: null, isActive: true },
    invitedBy: { firstName: "Admin", lastName: "User" },
    ...over,
  });

  it("records a pending invitation instead of adding the member", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.user.findUnique.mockResolvedValue(alumnus());
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(null);
    prismaMock.chapterInvitation.upsert.mockResolvedValue(invitationRow());

    await svc.invite("admin-1", "c1", "user-1");

    expect((prismaMock.chapterInvitation.upsert.mock.calls.at(-1)![0] as any).create).toMatchObject({
      chapterId: "c1", userId: "user-1", invitedById: "admin-1",
    });
    // Crucially: inviting must NOT grant membership.
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("re-inviting after a decline resets the same row to PENDING", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.user.findUnique.mockResolvedValue(alumnus());
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(invitationRow({ status: "DECLINED" }));
    prismaMock.chapterInvitation.upsert.mockResolvedValue(invitationRow());

    await svc.invite("admin-1", "c1", "user-1");
    const args = prismaMock.chapterInvitation.upsert.mock.calls.at(-1)![0] as any;
    expect(args.where).toEqual({ chapterId_userId: { chapterId: "c1", userId: "user-1" } });
    expect(args.update).toMatchObject({ status: "PENDING", respondedAt: null });
  });

  it("rejects a second pending invitation to the same chapter", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.user.findUnique.mockResolvedValue(alumnus());
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(invitationRow({ status: "PENDING" }));
    await expect(svc.invite("admin-1", "c1", "user-1")).rejects.toMatchObject({ status: 409 });
  });

  it("rejects inviting a non-alumnus", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.user.findUnique.mockResolvedValue(alumnus({ roles: [{ role: "STUDENT" }] }));
    await expect(svc.invite("admin-1", "c1", "user-1")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects inviting an existing member of that chapter", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.user.findUnique.mockResolvedValue(
      alumnus({ profile: { chapterId: "c1", chapter: { name: "Pune Chapter" } } }),
    );
    await expect(svc.invite("admin-1", "c1", "user-1")).rejects.toMatchObject({ status: 409 });
  });

  it("rejects inviting into an archived chapter", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow({ isActive: false }));
    prismaMock.user.findUnique.mockResolvedValue(alumnus());
    await expect(svc.invite("admin-1", "c1", "user-1")).rejects.toMatchObject({ status: 400 });
  });

  it("surfaces the current chapter so the email can warn about the move", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow({ id: "c2" }));
    prismaMock.user.findUnique.mockResolvedValue(
      alumnus({ profile: { chapterId: "c1", chapter: { name: "Pune Chapter" } } }),
    );
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(null);
    prismaMock.chapterInvitation.upsert.mockResolvedValue(invitationRow({ chapterId: "c2" }));

    const res = await svc.invite("admin-1", "c2", "user-1");
    expect(res.currentChapterName).toBe("Pune Chapter");
  });
});

describe("modules/chapters/service — responding to an invitation", () => {
  const pending = (over: Record<string, unknown> = {}) => ({
    id: "inv-1",
    chapterId: "c1",
    userId: "user-1",
    status: "PENDING",
    chapter: { id: "c1", slug: "pune", name: "Pune Chapter", isActive: true },
    invitedBy: { firstName: "Admin", lastName: "User" },
    ...over,
  });

  it("accepting grants membership in exactly one chapter", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending());
    prismaMock.chapterInvitation.update.mockResolvedValue(pending({ status: "ACCEPTED" }));
    prismaMock.profile.upsert.mockResolvedValue({});

    await svc.respondToInvitation("user-1", "inv-1", "ACCEPT");

    const args = prismaMock.profile.upsert.mock.calls.at(-1)![0] as any;
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.update).toEqual({ chapterId: "c1" });
  });

  it("declining records the answer and grants nothing", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending());
    prismaMock.chapterInvitation.update.mockResolvedValue(pending({ status: "DECLINED" }));

    await svc.respondToInvitation("user-1", "inv-1", "DECLINE");

    expect((prismaMock.chapterInvitation.update.mock.calls.at(-1)![0] as any).data.status).toBe("DECLINED");
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("refuses to let somebody answer another person's invitation", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending());
    await expect(svc.respondToInvitation("intruder", "inv-1", "ACCEPT")).rejects.toMatchObject({ status: 403 });
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent when the same emailed link is clicked twice", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending({ status: "ACCEPTED" }));
    const res = await svc.respondToInvitation("user-1", "inv-1", "ACCEPT");
    expect(res.alreadyHandled).toBe(true);
    expect(prismaMock.chapterInvitation.update).not.toHaveBeenCalled();
  });

  it("rejects flipping an answer that was already given", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending({ status: "DECLINED" }));
    await expect(svc.respondToInvitation("user-1", "inv-1", "ACCEPT")).rejects.toMatchObject({ status: 400 });
  });

  it("explains that a withdrawn invitation can no longer be accepted", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(pending({ status: "CANCELLED" }));
    await expect(svc.respondToInvitation("user-1", "inv-1", "ACCEPT")).rejects.toMatchObject({
      message: expect.stringContaining("withdrawn"),
    });
  });

  it("cannot accept into a chapter archived since the invite", async () => {
    prismaMock.chapterInvitation.findUnique.mockResolvedValue(
      pending({ chapter: { id: "c1", slug: "pune", name: "Pune Chapter", isActive: false } }),
    );
    await expect(svc.respondToInvitation("user-1", "inv-1", "ACCEPT")).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });
});

describe("modules/chapters/service — removing a member", () => {
  it("clears membership and the spent invitation, keeping the account", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ chapterId: "c1" });
    prismaMock.profile.upsert.mockResolvedValue({});
    prismaMock.chapterInvitation.deleteMany.mockResolvedValue({ count: 1 });

    await svc.removeMember("admin-1", "c1", "user-1");

    expect((prismaMock.profile.upsert.mock.calls.at(-1)![0] as any).update).toEqual({ chapterId: null });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect((prismaMock.auditLog.create.mock.calls.at(-1)![0] as any).data.action).toBe("chapter.member_remove");
  });

  it("404s when they are not in that chapter", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ chapterId: "other" });
    await expect(svc.removeMember("admin-1", "c1", "user-1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("modules/chapters/service — getMine", () => {
  it("returns null for someone with no chapter", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ chapter: null });
    await expect(svc.getMine("user-1")).resolves.toBeNull();
  });
});

describe("modules/chapters/service — members list", () => {
  it("scopes members to approved alumni of that chapter", async () => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.profile.findMany.mockResolvedValue([]);
    prismaMock.profile.count.mockResolvedValue(0);
    await svc.listMembers("c1", { page: 1, pageSize: 20 } as any);

    expect((prismaMock.profile.findMany.mock.calls.at(-1)![0] as any).where).toEqual({
      chapterId: "c1",
      user: { status: "APPROVED", roles: { some: { role: "ALUMNI" } } },
    });
  });

  const selectUser = async (opts?: { includeEmail?: boolean }) => {
    prismaMock.chapter.findUnique.mockResolvedValue(chapterRow());
    prismaMock.profile.findMany.mockResolvedValue([]);
    prismaMock.profile.count.mockResolvedValue(0);
    await svc.listMembers("c1", { page: 1, pageSize: 20 } as any, opts);
    return (prismaMock.profile.findMany.mock.calls.at(-1)![0] as any).select.user.select;
  };

  it("withholds member emails by default — the member-facing roster", async () => {
    // The portal's read-only Chapters page shows this list to every approved
    // member, and the alumni directory never exposes an email either.
    expect(await selectUser()).toEqual({ firstName: true, lastName: true, email: false });
  });

  it("gives admins the email, since they manage membership", async () => {
    expect(await selectUser({ includeEmail: true })).toEqual({
      firstName: true,
      lastName: true,
      email: true,
    });
  });
});

describe("modules/chapters/service — ordering", () => {
  it("orders by the alumni office's sortOrder, not alphabetically", async () => {
    await svc.list();
    // Alphabetical would put Bangalore first; the office wants Pune, Mumbai,
    // Bangalore, Global, which is what sortOrder encodes.
    expect((prismaMock.chapter.findMany.mock.calls.at(-1)![0] as any).orderBy).toEqual([
      { isActive: "desc" },
      { sortOrder: "asc" },
      { name: "asc" },
    ]);
  });
});
