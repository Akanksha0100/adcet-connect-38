/**
 * Regional alumni chapters.
 *
 * Chapters live in the database (`/chapters`) so admins can add new ones and
 * member counts stay live. The static list below is only a fallback for the
 * public landing page, which must still render its chapter cards when the API
 * is unreachable — it mirrors the rows seeded by the backend migration.
 *
 * Membership is **invite-only**: an admin invites an alumnus, and they join
 * only once they accept. There is no self-service join anywhere in the UI.
 * A chapter can be deleted only while empty; otherwise it is archived.
 */
import { api } from "@/lib/api";

export interface Chapter {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  /** Tailwind gradient classes evoking the city, used for the card header. */
  accent: string | null;
  city: string | null;
  isActive: boolean;
  memberCount: number;
}

/** Gradient behind the chapter name when no city photograph exists. */
export const DEFAULT_CHAPTER_ACCENT = "from-slate-500 to-slate-400";

/**
 * City photographs in `public/Chapters/`, keyed by chapter slug and by city so
 * either spelling resolves ("bangalore" the slug, "Bengaluru" the file).
 * A chapter with no photograph falls back to its `accent` gradient.
 */
const CHAPTER_IMAGES: Record<string, string> = {
  pune: "/Chapters/Pune.png",
  mumbai: "/Chapters/Mumbai.png",
  bangalore: "/Chapters/Bengaluru.png",
  bengaluru: "/Chapters/Bengaluru.png",
};

export const chapterImage = (c: Pick<Chapter, "slug" | "city">): string | undefined => {
  const keys = [c.slug, c.city].filter(Boolean).map((k) => k!.toLowerCase().trim());
  for (const k of keys) if (CHAPTER_IMAGES[k]) return CHAPTER_IMAGES[k];
  return undefined;
};

/** Mirrors `DEFAULT_CHAPTERS` in `backend/src/config/constants.ts`. */
export const FALLBACK_CHAPTERS: Chapter[] = [
  {
    id: "pune",
    slug: "pune",
    name: "Pune Chapter",
    city: "Pune",
    blurb:
      "Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.",
    accent: "from-orange-500 to-amber-400",
    isActive: true,
    memberCount: 0,
  },
  {
    id: "mumbai",
    slug: "mumbai",
    name: "Mumbai Chapter",
    city: "Mumbai",
    blurb:
      "Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country's commercial capital.",
    accent: "from-cyan-500 to-sky-400",
    isActive: true,
    memberCount: 0,
  },
  {
    id: "bangalore",
    slug: "bangalore",
    name: "Bangalore Chapter",
    city: "Bangalore",
    blurb:
      "Engineers, founders and researchers in India's technology hub, driving mentorship, internships and startup collaboration for ADCET students.",
    accent: "from-emerald-500 to-lime-400",
    isActive: true,
    memberCount: 0,
  },
];

export type ChapterInvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export interface ChapterInvitation {
  id: string;
  chapterId: string;
  userId: string;
  status: ChapterInvitationStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  chapter: Pick<Chapter, "id" | "slug" | "name" | "city" | "blurb" | "accent" | "isActive">;
  invitedBy: { firstName: string; lastName: string };
}

export interface ChapterMember {
  userId: string;
  department?: string | null;
  graduationYear?: number | null;
  city?: string | null;
  currentCompany?: string | null;
  currentRole?: string | null;
  user: { firstName: string; lastName: string; email: string };
}

/** Active chapters. Admins may pass `includeInactive` to see archived ones. */
export const fetchChapters = (opts: { includeInactive?: boolean } = {}) =>
  api
    .get<{ items: Chapter[] }>("/chapters", opts.includeInactive ? { includeInactive: true } : undefined)
    .then((r) => r.items);

/*
 * There are deliberately no member-facing helpers here (my chapter, my
 * invitations, respond-to-invitation). Chapters are administered entirely by
 * the alumni office and never surfaced to alumni in the portal; an invitation
 * is answered from the signed one-click links in its email, which hit the
 * public `GET /chapters/invitations/email-respond` endpoint with no session.
 * The corresponding API routes still exist and are still tested — only the
 * frontend entry points are gone.
 */

/* --------------------------------- admin --------------------------------- */

export const fetchChapterMembers = (chapterId: string) =>
  api.get<{ items: ChapterMember[] }>(`/chapters/${chapterId}/members`, { pageSize: 100 }).then((r) => r.items);

export const fetchChapterInvitations = (chapterId: string) =>
  api
    .get<{ items: (ChapterInvitation & { user: { id: string; firstName: string; lastName: string; email: string } })[] }>(
      `/chapters/${chapterId}/invitations`,
    )
    .then((r) => r.items);

/** Invite an alumnus. They become a member only after accepting. */
export const inviteToChapter = (chapterId: string, userId: string, message?: string) =>
  api.post<ChapterInvitation>(`/chapters/${chapterId}/invitations`, { userId, message: message || undefined });

export const cancelChapterInvitation = (invitationId: string) =>
  api.delete(`/chapters/invitations/${invitationId}`);

export const removeChapterMember = (chapterId: string, userId: string) =>
  api.delete(`/chapters/${chapterId}/members/${userId}`);

/** Only succeeds for a chapter with no members and no events (else 409). */
export const deleteChapter = (chapterId: string) => api.delete(`/chapters/${chapterId}`);
