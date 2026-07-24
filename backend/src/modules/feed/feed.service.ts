import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import type { AppRoleName } from "../../config/constants.js";
import { getStorage } from "../../storage/index.js";
import { logger } from "../../lib/logger.js";
import { notify } from "../notifications/notifications.service.js";

type Caller = { sub: string; roles: AppRoleName[] };
const isAdmin = (c: Caller) => c.roles.includes("ADMIN");

/**
 * Author card data — name plus the department/graduation-year subtitle and
 * avatar the feed renders under every post and comment.
 */
const authorSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    profile: { select: { avatarKey: true, department: true, graduationYear: true } },
  },
} as const;

/**
 * `likes` is filtered to the caller's own row so a single query answers
 * "did I like this?" without loading every like on the post.
 */
const postInclude = (callerId: string) => ({
  author: authorSelect,
  media: { orderBy: { position: "asc" } },
  likes: { where: { userId: callerId }, select: { id: true } },
  _count: { select: { likes: true, comments: true } },
}) satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

/** Flatten Prisma's shape into the DTO the feed UI consumes. */
const toDto = (post: PostWithRelations) => {
  const { likes, _count, ...rest } = post;
  return {
    ...rest,
    likeCount: _count.likes,
    commentCount: _count.comments,
    likedByMe: likes.length > 0,
  };
};

/** Best-effort removal of a post's media objects; never blocks the delete. */
const purgeMedia = async (keys: string[]) => {
  const storage = getStorage();
  await Promise.all(
    keys.map((key) =>
      storage.delete(key).catch((err) => logger.error({ err, key }, "failed to delete post media")),
    ),
  );
};

export const list = async (q: PaginationQuery & { authorId?: string; q?: string }, caller: Caller) => {
  const where: Prisma.PostWhereInput = {
    ...(q.authorId && { authorId: q.authorId }),
    ...(q.q && { content: { contains: q.q, mode: "insensitive" } }),
  };
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: postInclude(caller.sub),
      ...paginate(q),
    }),
    prisma.post.count({ where }),
  ]);
  return { items: items.map(toDto), pagination: paginationMeta(total, q) };
};

export const getById = async (id: string, caller: Caller) => {
  const post = await prisma.post.findUnique({ where: { id }, include: postInclude(caller.sub) });
  if (!post) throw NotFound("Post not found");
  return toDto(post);
};

export const create = async (
  caller: Caller,
  data: { content?: string; media: { key: string; type: "IMAGE" | "VIDEO"; mimeType?: string }[] },
) => {
  const post = await prisma.post.create({
    data: {
      authorId: caller.sub,
      content: data.content ?? null,
      media: {
        create: data.media.map((m, position) => ({
          key: m.key,
          type: m.type,
          mimeType: m.mimeType ?? null,
          position,
        })),
      },
    },
    include: postInclude(caller.sub),
  });
  return toDto(post);
};

/** Authors edit their own text. Admins can remove posts but not rewrite them. */
export const update = async (caller: Caller, id: string, content: string) => {
  const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!existing) throw NotFound("Post not found");
  if (existing.authorId !== caller.sub) throw Forbidden("You can only edit your own posts");
  const post = await prisma.post.update({
    where: { id },
    data: { content, editedAt: new Date() },
    include: postInclude(caller.sub),
  });
  return toDto(post);
};

export const remove = async (caller: Caller, id: string) => {
  const existing = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, media: { select: { key: true } } },
  });
  if (!existing) throw NotFound("Post not found");
  if (existing.authorId !== caller.sub && !isAdmin(caller)) throw Forbidden();
  // Cascades clear media/likes/comments/reports rows; storage objects are ours to clean.
  await prisma.post.delete({ where: { id } });
  await purgeMedia(existing.media.map((m) => m.key));
};

/** Idempotent per user: returns the resulting state so the UI can sync. */
export const toggleLike = async (caller: Caller, postId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw NotFound("Post not found");

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: caller.sub } },
    select: { id: true },
  });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({ data: { postId, userId: caller.sub } });
  }
  const likeCount = await prisma.postLike.count({ where: { postId } });
  return { liked: !existing, likeCount };
};

export const listComments = async (postId: string, q: PaginationQuery) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw NotFound("Post not found");
  const where = { postId };
  const [items, total] = await Promise.all([
    prisma.postComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: { user: authorSelect },
      ...paginate(q),
    }),
    prisma.postComment.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const addComment = async (caller: Caller, postId: string, body: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw NotFound("Post not found");
  const comment = await prisma.postComment.create({
    data: { postId, userId: caller.sub, body },
    include: { user: authorSelect },
  });
  // Tell the author someone replied — in-app only, no email for feed chatter.
  if (post.authorId !== caller.sub) {
    const name = `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim() || "Someone";
    await notify(post.authorId, {
      type: "feed.comment",
      title: `${name} commented on your post`,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      data: { postId },
    });
  }
  return comment;
};

/** The comment author, the post author, and admins may remove a comment. */
export const removeComment = async (caller: Caller, postId: string, commentId: string) => {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { postId: true, userId: true, post: { select: { authorId: true } } },
  });
  if (!comment || comment.postId !== postId) throw NotFound("Comment not found");
  const allowed =
    comment.userId === caller.sub || comment.post.authorId === caller.sub || isAdmin(caller);
  if (!allowed) throw Forbidden();
  await prisma.postComment.delete({ where: { id: commentId } });
};

/** Re-reporting the same post reopens/updates the existing row rather than 409-ing. */
export const report = async (caller: Caller, postId: string, reason: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw NotFound("Post not found");
  if (post.authorId === caller.sub) throw Forbidden("You cannot report your own post");
  await prisma.postReport.upsert({
    where: { postId_reporterId: { postId, reporterId: caller.sub } },
    create: { postId, reporterId: caller.sub, reason },
    update: { reason, status: "OPEN", reviewedAt: null },
  });
  return { reported: true };
};

// ---------------------------------------------------------------- admin

export const listReports = async (q: PaginationQuery & { status?: "OPEN" | "ACTIONED" | "DISMISSED" }) => {
  const where: Prisma.PostReportWhereInput = { ...(q.status && { status: q.status }) };
  const [items, total] = await Promise.all([
    prisma.postReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        post: {
          include: {
            author: authorSelect,
            media: { orderBy: { position: "asc" } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      ...paginate(q),
    }),
    prisma.postReport.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};

export const resolveReport = async (id: string, status: "ACTIONED" | "DISMISSED") => {
  const existing = await prisma.postReport.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw NotFound("Report not found");
  return prisma.postReport.update({ where: { id }, data: { status, reviewedAt: new Date() } });
};
