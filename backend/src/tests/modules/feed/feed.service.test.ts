import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));

const deleteObject = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../storage/index.js", () => ({
  getStorage: () => ({ delete: deleteObject }),
}));

const svc = await import("../../../modules/feed/feed.service.js");

const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const OTHER = { sub: "u-2", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin", roles: ["ADMIN"] as any };

/** Minimal shape matching `postInclude` so `toDto` can flatten it. */
const rawPost = (over: Record<string, unknown> = {}) => ({
  id: "p-1",
  authorId: "u-1",
  content: "hello",
  media: [],
  likes: [],
  _count: { likes: 3, comments: 2 },
  ...over,
});

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
  deleteObject.mockClear();
});

describe("modules/feed/service", () => {
  it("list flattens counts and reports likedByMe from the caller's own like row", async () => {
    prismaMock.post.findMany.mockResolvedValueOnce([
      rawPost({ likes: [{ id: "l-1" }] }),
      rawPost({ id: "p-2", likes: [] }),
    ]);
    prismaMock.post.count.mockResolvedValueOnce(2);

    const res = await svc.list({ page: 1, pageSize: 10 } as any, ALUMNI);

    expect(res.items[0]).toMatchObject({ likeCount: 3, commentCount: 2, likedByMe: true });
    expect(res.items[1].likedByMe).toBe(false);
    // The like sub-query must be scoped to the caller, not every user.
    const args = prismaMock.post.findMany.mock.calls[0][0] as any;
    expect(args.include.likes.where).toEqual({ userId: "u-1" });
  });

  /** Let the caller through the monthly quota check with `used` slots spent. */
  const allowPost = (used = 0, limit?: number) => {
    prismaMock.appSetting.findUnique.mockResolvedValueOnce(
      limit === undefined ? null : { key: "feedPostsPerMonth", value: String(limit) },
    );
    prismaMock.postQuotaUsage.findUnique.mockResolvedValueOnce(used ? { count: used } : null);
  };

  it("create stamps authorId from the caller and positions media in order", async () => {
    allowPost();
    prismaMock.post.create.mockResolvedValueOnce(rawPost());
    await svc.create(ALUMNI, {
      content: "trip",
      media: [
        { key: "post/a.jpg", type: "IMAGE" },
        { key: "post/b.jpg", type: "IMAGE" },
      ],
    });

    const data = (prismaMock.post.create.mock.calls[0][0] as any).data;
    expect(data.authorId).toBe("u-1");
    expect(data.media.create).toEqual([
      { key: "post/a.jpg", type: "IMAGE", mimeType: null, position: 0 },
      { key: "post/b.jpg", type: "IMAGE", mimeType: null, position: 1 },
    ]);
  });

  describe("monthly post quota", () => {
    it("uses the configured limit and this month's usage counter", async () => {
      allowPost(3, 10);
      const quota = await svc.getPostQuota(ALUMNI);

      expect(quota).toMatchObject({ limit: 10, used: 3, remaining: 7, exempt: false });
      // Scoped to the caller and the current period — never a count of posts,
      // which would give slots back on delete.
      const args = prismaMock.postQuotaUsage.findUnique.mock.calls[0][0] as any;
      expect(args.where.userId_period).toEqual({ userId: "u-1", period: svc.periodKey() });
      expect(prismaMock.post.count).not.toHaveBeenCalled();
    });

    it("treats a member with no counter row as having spent nothing", async () => {
      allowPost(0, 10);
      expect(await svc.getPostQuota(ALUMNI)).toMatchObject({ used: 0, remaining: 10 });
    });

    it("falls back to the default limit when an admin has not set one", async () => {
      allowPost(0);
      const quota = await svc.getPostQuota(ALUMNI);
      expect(quota.limit).toBe(10);
    });

    it("exempts admins entirely", async () => {
      const quota = await svc.getPostQuota(ADMIN);
      expect(quota).toMatchObject({ exempt: true, limit: null, remaining: null });
      // No limit lookup and no usage read for an exempt caller.
      expect(prismaMock.postQuotaUsage.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.appSetting.findUnique).not.toHaveBeenCalled();
    });

    it("reports zero remaining rather than a negative once over the limit", async () => {
      // Possible if an admin lowers the limit after members have posted.
      allowPost(12, 10);
      const quota = await svc.getPostQuota(ALUMNI);
      expect(quota.remaining).toBe(0);
    });

    it("resets on the first of the next month", async () => {
      allowPost(0, 10);
      const quota = await svc.getPostQuota(ALUMNI, new Date(2026, 7, 20));
      expect(new Date(quota.resetsAt)).toEqual(new Date(2026, 8, 1));
    });

    it("create returns the decremented allowance for the toast", async () => {
      allowPost(3, 10);
      prismaMock.post.create.mockResolvedValueOnce(rawPost());
      const res = await svc.create(ALUMNI, { content: "hi", media: [] });
      expect(res.quota).toMatchObject({ limit: 10, used: 4, remaining: 6 });
    });

    it("create refuses once the allowance is spent, without writing a post", async () => {
      allowPost(10, 10);
      await expect(svc.create(ALUMNI, { content: "hi", media: [] })).rejects.toMatchObject({
        status: 429,
      });
      expect(prismaMock.post.create).not.toHaveBeenCalled();
    });

    it("does not report a used count for an exempt admin", async () => {
      prismaMock.post.create.mockResolvedValueOnce(rawPost());
      const res = await svc.create(ADMIN, { content: "hi", media: [] });
      expect(res.quota.used).toBe(0);
    });

    it("spends a slot permanently — publishing increments an append-only counter", async () => {
      allowPost(3, 10);
      prismaMock.post.create.mockResolvedValueOnce(rawPost());
      await svc.create(ALUMNI, { content: "hi", media: [] });

      const args = prismaMock.postQuotaUsage.upsert.mock.calls[0][0] as any;
      expect(args.where.userId_period).toEqual({ userId: "u-1", period: svc.periodKey() });
      expect(args.create).toMatchObject({ count: 1 });
      expect(args.update).toEqual({ count: { increment: 1 } });
    });

    it("deleting a post never gives the slot back", async () => {
      // `remove` must not touch the counter — that is the whole point of
      // keeping usage separate from the Post table.
      prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-1", media: [] });
      await svc.remove(ALUMNI, "p-1");

      expect(prismaMock.postQuotaUsage.upsert).not.toHaveBeenCalled();
      expect(prismaMock.postQuotaUsage.update).not.toHaveBeenCalled();
      expect(prismaMock.postQuotaUsage.delete).not.toHaveBeenCalled();
      expect(prismaMock.postQuotaUsage.deleteMany).not.toHaveBeenCalled();
    });

    it("does not spend a slot for an exempt admin", async () => {
      prismaMock.post.create.mockResolvedValueOnce(rawPost());
      await svc.create(ADMIN, { content: "hi", media: [] });
      expect(prismaMock.postQuotaUsage.upsert).not.toHaveBeenCalled();
    });

    it("lets an admin post past the limit", async () => {
      prismaMock.post.create.mockResolvedValueOnce(rawPost());
      const res = await svc.create(ADMIN, { content: "announcement", media: [] });
      expect(res.quota).toMatchObject({ exempt: true, remaining: null });
      expect(prismaMock.post.create).toHaveBeenCalled();
    });
  });

  it("update rejects non-authors — even admins cannot rewrite someone's words", async () => {
    prismaMock.post.findUnique.mockResolvedValue({ authorId: "u-1" });
    await expect(svc.update(OTHER, "p-1", "edited")).rejects.toMatchObject({ status: 403 });
    await expect(svc.update(ADMIN, "p-1", "edited")).rejects.toMatchObject({ status: 403 });
  });

  it("update stamps editedAt so the UI can show an edited marker", async () => {
    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-1" });
    prismaMock.post.update.mockResolvedValueOnce(rawPost());
    await svc.update(ALUMNI, "p-1", "edited");
    expect((prismaMock.post.update.mock.calls[0][0] as any).data.editedAt).toBeInstanceOf(Date);
  });

  it("remove: admins may delete any post and its storage objects are purged", async () => {
    prismaMock.post.findUnique.mockResolvedValueOnce({
      authorId: "u-1",
      media: [{ key: "post/u-1/clip.mp4" }],
    });
    prismaMock.post.delete.mockResolvedValueOnce({});
    await svc.remove(ADMIN, "p-1");
    expect(deleteObject).toHaveBeenCalledWith("post/u-1/clip.mp4");
  });

  it("remove: a stranger gets 403 and nothing is deleted", async () => {
    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-1", media: [] });
    await expect(svc.remove(OTHER, "p-1")).rejects.toMatchObject({ status: 403 });
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("toggleLike adds a like when absent and removes it when present", async () => {
    prismaMock.post.findUnique.mockResolvedValue({ id: "p-1" });

    prismaMock.postLike.findUnique.mockResolvedValueOnce(null);
    prismaMock.postLike.count.mockResolvedValueOnce(1);
    await expect(svc.toggleLike(ALUMNI, "p-1")).resolves.toEqual({ liked: true, likeCount: 1 });
    expect(prismaMock.postLike.create).toHaveBeenCalled();

    prismaMock.postLike.findUnique.mockResolvedValueOnce({ id: "l-1" });
    prismaMock.postLike.count.mockResolvedValueOnce(0);
    await expect(svc.toggleLike(ALUMNI, "p-1")).resolves.toEqual({ liked: false, likeCount: 0 });
    expect(prismaMock.postLike.delete).toHaveBeenCalledWith({ where: { id: "l-1" } });
  });

  it("addComment notifies the post author but not when they comment on themselves", async () => {
    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-2" });
    prismaMock.postComment.create.mockResolvedValueOnce({
      id: "c-1",
      user: { firstName: "Alice", lastName: "A" },
    });
    await svc.addComment(ALUMNI, "p-1", "nice");
    expect(notifyMock).toHaveBeenCalledWith("u-2", expect.objectContaining({ type: "feed.comment" }));

    notifyMock.mockClear();
    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-1" });
    prismaMock.postComment.create.mockResolvedValueOnce({
      id: "c-2",
      user: { firstName: "Alice", lastName: "A" },
    });
    await svc.addComment(ALUMNI, "p-1", "self reply");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("removeComment allows the comment author, the post author and admins", async () => {
    const comment = { postId: "p-1", userId: "u-2", post: { authorId: "u-1" } };

    for (const caller of [OTHER, ALUMNI, ADMIN]) {
      prismaMock.postComment.findUnique.mockResolvedValueOnce(comment);
      prismaMock.postComment.delete.mockResolvedValueOnce({});
      await expect(svc.removeComment(caller, "p-1", "c-1")).resolves.toBeUndefined();
    }

    prismaMock.postComment.findUnique.mockResolvedValueOnce(comment);
    await expect(
      svc.removeComment({ sub: "u-3", roles: ["ALUMNI"] as any }, "p-1", "c-1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("removeComment 404s when the comment belongs to a different post", async () => {
    prismaMock.postComment.findUnique.mockResolvedValueOnce({
      postId: "p-OTHER",
      userId: "u-1",
      post: { authorId: "u-1" },
    });
    await expect(svc.removeComment(ALUMNI, "p-1", "c-1")).rejects.toMatchObject({ status: 404 });
  });

  it("report upserts (re-reporting reopens) and blocks self-reports", async () => {
    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-2" });
    prismaMock.postReport.upsert.mockResolvedValueOnce({});
    await svc.report(ALUMNI, "p-1", "spam");
    expect((prismaMock.postReport.upsert.mock.calls[0][0] as any).update).toMatchObject({
      status: "OPEN",
      reviewedAt: null,
    });

    prismaMock.post.findUnique.mockResolvedValueOnce({ authorId: "u-1" });
    await expect(svc.report(ALUMNI, "p-1", "spam")).rejects.toMatchObject({ status: 403 });
  });
});
