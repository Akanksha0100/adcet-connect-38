/**
 * Feed domain types + upload helper shared by the feed pages and components.
 * Mirrors `backend/src/modules/feed/`.
 */
import { api } from "@/lib/api";

/** Keep in sync with FEED_MEDIA in backend/src/config/constants.ts. */
export const FEED_MEDIA = {
  MAX_IMAGES: 2,
  MAX_VIDEOS: 1,
  MAX_BYTES: 10 * 1024 * 1024,
} as const;

export const MEDIA_ACCEPT = "image/*,video/*";

export type PostMediaType = "IMAGE" | "VIDEO";

export interface FeedAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profile?: {
    avatarKey?: string | null;
    department?: string | null;
    graduationYear?: number | null;
  } | null;
}

export interface PostMedia {
  id: string;
  key: string;
  type: PostMediaType;
  mimeType?: string | null;
  position: number;
}

export interface Post {
  id: string;
  content?: string | null;
  editedAt?: string | null;
  createdAt: string;
  author: FeedAuthor;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PostComment {
  id: string;
  body: string;
  createdAt: string;
  user: FeedAuthor;
}

export interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export const authorName = (a?: FeedAuthor | null) =>
  a ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || "Alumni" : "Alumni";

export const authorInitials = (a?: FeedAuthor | null) =>
  a ? `${a.firstName?.[0] ?? ""}${a.lastName?.[0] ?? ""}`.toUpperCase() || "A" : "A";

/** "CSE · 2019" — either half may be missing. */
export const authorSubtitle = (a?: FeedAuthor | null) =>
  [a?.profile?.department, a?.profile?.graduationYear].filter(Boolean).join(" · ");

/** Compact relative timestamp ("3h", "2d") like the big social apps use. */
export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
};

export const mediaTypeOf = (file: File): PostMediaType | null => {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return null;
};

/**
 * Presign + PUT straight to object storage. Going direct (rather than through
 * `POST /uploads/direct`) keeps 10 MB videos off the API process.
 */
export const uploadPostMedia = async (file: File): Promise<string> => {
  const presign = await api.post<{ uploadUrl: string; key: string }>("/uploads/presign", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    scope: "post",
  });
  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return presign.key;
};

/**
 * Validate a batch of newly picked files against the current selection.
 * Returns an error message, or null when the files are acceptable.
 */
export const validateSelection = (existing: { type: PostMediaType }[], incoming: File[]) => {
  const oversized = incoming.find((f) => f.size > FEED_MEDIA.MAX_BYTES);
  if (oversized) return `"${oversized.name}" is larger than 10 MB`;
  const unsupported = incoming.find((f) => !mediaTypeOf(f));
  if (unsupported) return `"${unsupported.name}" is not an image or video`;

  const all = [...existing, ...incoming.map((f) => ({ type: mediaTypeOf(f)! }))];
  const images = all.filter((m) => m.type === "IMAGE").length;
  const videos = all.filter((m) => m.type === "VIDEO").length;
  if (images && videos) return "Attach images or a video, not both";
  if (images > FEED_MEDIA.MAX_IMAGES) return `At most ${FEED_MEDIA.MAX_IMAGES} images per post`;
  if (videos > FEED_MEDIA.MAX_VIDEOS) return `Only ${FEED_MEDIA.MAX_VIDEOS} video per post`;
  return null;
};
