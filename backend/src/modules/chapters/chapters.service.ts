import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import { sendEmail } from "../../lib/mailer.js";
import { chapterInvitationEmail, chapterInvitationResponseHtml } from "../../lib/email-templates.js";
import { notify } from "../notifications/notifications.service.js";
import { logger } from "../../lib/logger.js";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me-32-chars-min";
const API_BASE_URL = () => process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`;

/**
 * Only approved alumni count as chapter members — that is the set the admin
 * filters and chapter mailings actually target, so it is the number worth
 * showing next to a chapter everywhere in the UI.
 */
const memberCountInclude = {
  _count: {
    select: {
      members: {
        where: { user: { status: "APPROVED" as const, roles: { some: { role: "ALUMNI" as const } } } },
      },
    },
  },
} satisfies Prisma.ChapterInclude;

const shape = <T extends { _count: { members: number } }>(c: T) => {
  const { _count, ...rest } = c;
  return { ...rest, memberCount: _count.members };
};

/** `includeInactive` is honoured for admins only — see the routes file. */
export const list = async (opts: { includeInactive?: boolean } = {}) => {
  const items = await prisma.chapter.findMany({
    where: opts.includeInactive ? {} : { isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: memberCountInclude,
  });
  return { items: items.map(shape) };
};

export const getBySlug = async (slug: string) => {
  const chapter = await prisma.chapter.findUnique({ where: { slug }, include: memberCountInclude });
  if (!chapter) throw NotFound("Chapter not found");
  return shape(chapter);
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const create = async (
  actorId: string,
  data: { name: string; slug?: string; city?: string; blurb?: string; accent?: string },
) => {
  const slug = data.slug ?? slugify(data.name);
  if (!slug) throw BadRequest("Could not derive a slug from that name — please provide one");

  const existing = await prisma.chapter.findUnique({ where: { slug } });
  if (existing) throw Conflict(`A chapter with the slug "${slug}" already exists`);

  const chapter = await prisma.chapter.create({ data: { ...data, slug } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "chapter.create",
      entity: "Chapter",
      entityId: chapter.id,
      metadata: { name: chapter.name, slug: chapter.slug },
    },
  });
  return { ...chapter, memberCount: 0 };
};

/**
 * Update a chapter's presentation or archive it. There is intentionally no
 * delete: removing a chapter would orphan its members and every event that
 * targets it, so `isActive: false` is the only way to retire one.
 */
export const update = async (
  actorId: string,
  id: string,
  data: { name?: string; city?: string | null; blurb?: string | null; accent?: string | null; isActive?: boolean },
) => {
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) throw NotFound("Chapter not found");

  const chapter = await prisma.chapter.update({ where: { id }, data, include: memberCountInclude });
  await prisma.auditLog.create({
    data: {
      actorId,
      action:
        data.isActive === false
          ? "chapter.archive"
          : data.isActive === true && !existing.isActive
            ? "chapter.restore"
            : "chapter.update",
      entity: "Chapter",
      entityId: id,
      metadata: { name: chapter.name, slug: chapter.slug, changes: data as Prisma.InputJsonValue },
    },
  });
  return shape(chapter);
};

/**
 * Delete a chapter — permitted **only while it is empty**. Once it has members
 * or events, deleting would orphan them, so the caller is told to archive
 * instead (which keeps everything and just hides the chapter).
 */
export const remove = async (actorId: string, id: string) => {
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) throw NotFound("Chapter not found");

  const [members, events] = await Promise.all([
    prisma.profile.count({ where: { chapterId: id } }),
    prisma.event.count({ where: { chapterId: id } }),
  ]);

  if (members > 0 || events > 0) {
    const parts = [
      members > 0 ? `${members} member${members === 1 ? "" : "s"}` : null,
      events > 0 ? `${events} event${events === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    throw Conflict(
      `"${chapter.name}" still has ${parts.join(" and ")}. Deleting it would orphan them — ` +
        `remove them first, or archive the chapter instead to retire it without losing anything.`,
      { members, events },
    );
  }

  // Pending invitations to an empty chapter are meaningless once it's gone.
  await prisma.chapterInvitation.deleteMany({ where: { chapterId: id } });
  await prisma.chapter.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "chapter.delete",
      entity: "Chapter",
      entityId: id,
      metadata: { name: chapter.name, slug: chapter.slug },
    },
  });
};

/** The caller's current chapter, or null when they haven't joined one. */
export const getMine = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { chapter: { include: memberCountInclude } },
  });
  return profile?.chapter ? shape(profile.chapter) : null;
};

/* -------------------------------------------------------------------------- */
/*  Membership. Invite-only: an admin invites an alumnus and they join when    */
/*  they accept. There is no self-service join — see chapters.routes.ts.       */
/* -------------------------------------------------------------------------- */

/**
 * Move a user into a chapter. A profile holds a single `chapterId`, so this
 * repoints it — a member is never in two chapters at once. Only ever called
 * once an invitation has been accepted.
 */
const setMembership = (userId: string, chapterId: string | null) =>
  prisma.profile.upsert({
    where: { userId },
    update: { chapterId },
    create: { userId, chapterId },
  });

const invitationInclude = {
  chapter: {
    select: { id: true, slug: true, name: true, city: true, blurb: true, accent: true, isActive: true },
  },
  invitedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ChapterInvitationInclude;

/**
 * Invite an alumnus to a chapter. Re-inviting somebody who declined (or who
 * has a stale invitation) resets the same row to PENDING rather than creating
 * duplicates. Returns the invitation plus the email/notification payload the
 * caller dispatches.
 */
export const invite = async (
  actorId: string,
  chapterId: string,
  userId: string,
  message?: string,
) => {
  const [chapter, user] = await Promise.all([
    prisma.chapter.findUnique({ where: { id: chapterId } }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, profile: { select: { chapterId: true, chapter: { select: { name: true } } } } },
    }),
  ]);
  if (!chapter) throw NotFound("Chapter not found");
  if (!user) throw NotFound("User not found");
  if (!chapter.isActive) throw BadRequest("This chapter is archived — restore it before inviting members");
  if (!user.roles.some((r) => r.role === "ALUMNI")) throw BadRequest("Only alumni can be invited to a chapter");
  if (user.status !== "APPROVED") throw BadRequest("This account is not approved yet");
  if (user.profile?.chapterId === chapterId) throw Conflict("They are already a member of this chapter");

  const existing = await prisma.chapterInvitation.findUnique({
    where: { chapterId_userId: { chapterId, userId } },
  });
  if (existing?.status === "PENDING") throw Conflict("They already have a pending invitation to this chapter");

  const invitation = await prisma.chapterInvitation.upsert({
    where: { chapterId_userId: { chapterId, userId } },
    update: { status: "PENDING", invitedById: actorId, message: message ?? null, respondedAt: null, createdAt: new Date() },
    create: { chapterId, userId, invitedById: actorId, message: message ?? null },
    include: invitationInclude,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "chapter.invite",
      entity: "Chapter",
      entityId: chapterId,
      metadata: { chapter: chapter.name, userId, email: user.email },
    },
  });

  return {
    invitation,
    recipient: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    // Non-null only when accepting would move them out of another chapter.
    currentChapterName: user.profile?.chapterId ? user.profile.chapter?.name ?? null : null,
  };
};

/** Withdraw a pending invitation. */
export const cancelInvitation = async (actorId: string, invitationId: string) => {
  const invitation = await prisma.chapterInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw NotFound("Invitation not found");
  if (invitation.status !== "PENDING") throw BadRequest("Only a pending invitation can be cancelled");

  await prisma.chapterInvitation.update({
    where: { id: invitationId },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "chapter.invite_cancel",
      entity: "Chapter",
      entityId: invitation.chapterId,
      metadata: { userId: invitation.userId },
    },
  });
  return { id: invitationId, status: "CANCELLED" as const };
};

/** Pending invitations awaiting the caller's response. */
export const myInvitations = async (userId: string) => {
  const items = await prisma.chapterInvitation.findMany({
    where: { userId, status: "PENDING" },
    include: invitationInclude,
    orderBy: { createdAt: "desc" },
  });
  return { items };
};

/** Every invitation issued for a chapter — the admin's view of who's pending. */
export const listInvitations = async (chapterId: string) => {
  const items = await prisma.chapterInvitation.findMany({
    where: { chapterId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return { items };
};

/**
 * Record an invitee's answer. Accepting moves them into the chapter, leaving
 * any previous chapter — one chapter at a time. Idempotent for a repeated
 * click on the same emailed link.
 */
export const respondToInvitation = async (
  userId: string,
  invitationId: string,
  response: "ACCEPT" | "DECLINE",
) => {
  const invitation = await prisma.chapterInvitation.findUnique({
    where: { id: invitationId },
    include: invitationInclude,
  });
  if (!invitation) throw NotFound("Invitation not found");
  if (invitation.userId !== userId) throw Forbidden("This invitation belongs to somebody else");

  const accepted = response === "ACCEPT";

  if (invitation.status !== "PENDING") {
    // Clicking the same email link twice shouldn't look like an error.
    const alreadyMatches =
      (invitation.status === "ACCEPTED" && accepted) || (invitation.status === "DECLINED" && !accepted);
    if (alreadyMatches) return { invitation, alreadyHandled: true as const };
    throw BadRequest(
      invitation.status === "CANCELLED"
        ? "This invitation was withdrawn by an administrator"
        : "You have already responded to this invitation",
    );
  }

  if (accepted && !invitation.chapter.isActive) {
    throw BadRequest("This chapter has been archived and is no longer accepting members");
  }

  const updated = await prisma.chapterInvitation.update({
    where: { id: invitationId },
    data: { status: accepted ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
    include: invitationInclude,
  });

  if (accepted) await setMembership(userId, invitation.chapterId);

  return { invitation: updated, alreadyHandled: false as const };
};

/**
 * Deliver an invitation: an in-app notification plus a branded email whose
 * Accept/Decline buttons are signed one-click links (no login needed), the
 * same approach as the event RSVP emails.
 *
 * Best-effort — a mail failure never fails the invite, which is already
 * recorded and visible in the portal.
 */
export const sendInvitationEmail = async (input: Awaited<ReturnType<typeof invite>>) => {
  const { invitation, recipient, currentChapterName } = input;
  const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim() || "there";
  const invitedByName =
    `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`.trim() || "The alumni office";

  const token = jwt.sign({ invitationId: invitation.id, userId: recipient.id }, JWT_SECRET, {
    expiresIn: "60d",
  });
  const base = `${API_BASE_URL()}/chapters/invitations/email-respond`;

  await notify(recipient.id, {
    type: "chapter.invitation",
    title: `You're invited to join the ${invitation.chapter.name}`,
    body: currentChapterName
      ? `${invitedByName} invited you to the ${invitation.chapter.name}. Accepting will move you out of the ${currentChapterName}.`
      : `${invitedByName} invited you to the ${invitation.chapter.name}. Open Chapters to accept or decline.`,
    data: { chapterId: invitation.chapterId, invitationId: invitation.id },
  });

  try {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: recipient.id } });
    if (prefs && !prefs.notificationsEmail) return;

    const mail = chapterInvitationEmail(
      {
        chapterName: invitation.chapter.name,
        chapterCity: invitation.chapter.city,
        chapterBlurb: invitation.chapter.blurb,
        currentChapterName,
        invitedByName,
        message: invitation.message,
        acceptUrl: `${base}?token=${token}&response=ACCEPT`,
        declineUrl: `${base}?token=${token}&response=DECLINE`,
      },
      recipientName,
    );
    await sendEmail({ to: recipient.email, ...mail });
  } catch (err) {
    logger.error({ err, invitationId: invitation.id }, "failed to send chapter invitation email");
  }
};

/**
 * One-click accept/decline from the invitation email. Validates the signed
 * token and returns an HTML confirmation page — no session required.
 */
export const handleEmailInvitationResponse = async (
  token: string,
  response: "ACCEPT" | "DECLINE",
): Promise<string> => {
  let payload: { invitationId: string; userId: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as typeof payload;
  } catch {
    return chapterInvitationResponseHtml(
      "This link is no longer valid",
      "Your invitation link has expired or was malformed. Please respond from the alumni portal instead.",
      false,
    );
  }

  try {
    const { invitation, alreadyHandled } = await respondToInvitation(
      payload.userId,
      payload.invitationId,
      response,
    );
    const name = invitation.chapter.name;

    if (alreadyHandled) {
      return chapterInvitationResponseHtml(
        "Already recorded",
        invitation.status === "ACCEPTED"
          ? `You are already a member of the ${name}.`
          : `You have already declined the invitation to the ${name}.`,
      );
    }
    return response === "ACCEPT"
      ? chapterInvitationResponseHtml(`Welcome to the ${name}!`, `You are now a member of the ${name}. You'll receive its events and updates.`)
      : chapterInvitationResponseHtml(`Invitation declined`, `No problem — you have not been added to the ${name}, and nothing else has changed.`);
  } catch (e: any) {
    return chapterInvitationResponseHtml(
      "We couldn't record that",
      e?.message ?? "Something went wrong. Please respond from the alumni portal instead.",
      false,
    );
  }
};

/** Admin removal of a member. The person keeps their account and history. */
export const removeMember = async (actorId: string, chapterId: string, userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { chapterId: true } });
  if (!profile || profile.chapterId !== chapterId) throw NotFound("They are not a member of this chapter");

  await setMembership(userId, null);
  // Drop the accepted invitation too, so they can be invited again later.
  await prisma.chapterInvitation.deleteMany({ where: { chapterId, userId } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "chapter.member_remove",
      entity: "Chapter",
      entityId: chapterId,
      metadata: { userId },
    },
  });
  return { userId, chapterId: null };
};

/** Approved alumni belonging to a chapter — powers the admin member list. */
export const listMembers = async (chapterId: string, q: PaginationQuery) => {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) throw NotFound("Chapter not found");

  const where: Prisma.ProfileWhereInput = {
    chapterId,
    user: { status: "APPROVED", roles: { some: { role: "ALUMNI" } } },
  };
  const [items, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      select: {
        userId: true,
        department: true,
        graduationYear: true,
        city: true,
        currentCompany: true,
        currentRole: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ graduationYear: "desc" }, { user: { lastName: "asc" } }],
      ...paginate(q),
    }),
    prisma.profile.count({ where }),
  ]);
  return { items, pagination: paginationMeta(total, q) };
};
