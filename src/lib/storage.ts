/**
 * Resolve storage object keys (e.g. `post/<uid>/<uuid>-clip.mp4`) to browsable
 * URLs. Keys are stored bare in the DB, so the shape of the public URL is a
 * frontend concern and depends on which backend `STORAGE_DRIVER` is live.
 *
 * S3/MinIO/local: `<VITE_STORAGE_PUBLIC_BASE_URL>/<key>`.
 * Cloudinary: set `VITE_CLOUDINARY_CLOUD_NAME` and URLs are built the way
 * `backend/src/storage/CloudinaryStorage.ts` stores them — keep the two in sync.
 */

/** A var present but blank (`VITE_FOO=`) means "unset", not "empty base URL". */
const envVar = (name: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value?.trim() ? value.trim() : undefined;
};

const PUBLIC_BASE_URL = envVar("VITE_STORAGE_PUBLIC_BASE_URL");
export const STORAGE_BASE = PUBLIC_BASE_URL ?? "http://localhost:9000/adcet-alumni";

const CLOUDINARY_CLOUD_NAME = envVar("VITE_CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_FOLDER = (envVar("VITE_CLOUDINARY_FOLDER") ?? "").replace(/^\/+|\/+$/g, "");

/** Mirrors IMAGE_EXTS / VIDEO_EXTS in the backend Cloudinary adapter (audio rides on `video`). */
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "ico", "tif", "tiff", "heic", "heif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "3gp", "flv", "mp3", "wav", "aac", "m4a", "ogg", "flac"]);

const extensionOf = (key: string) => {
  const base = key.slice(key.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
};

const cloudinaryUrl = (key: string, cloudName: string) => {
  const ext = extensionOf(key);
  const resourceType = IMAGE_EXTS.has(ext) ? "image" : VIDEO_EXTS.has(ext) ? "video" : "raw";
  // Raw public ids keep their extension; image/video ones get it back as the delivery format.
  const stripped = resourceType === "raw" || !ext ? key : key.slice(0, -(ext.length + 1));
  const publicId = CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/${stripped}` : stripped;
  const suffix = resourceType === "raw" || !ext ? "" : `.${ext}`;
  const base = (PUBLIC_BASE_URL ?? `https://res.cloudinary.com/${cloudName}`).replace(/\/$/, "");
  return `${base}/${resourceType}/upload/${publicId}${suffix}`;
};

/**
 * Resolve a storage object key to a browsable URL.
 *
 * Only valid for publicly delivered objects. Keys in a private scope (resumes,
 * receipts under Cloudinary) must go through `POST /uploads/presign-download`.
 */
export const storageUrl = (key?: string | null) => {
  if (!key) return undefined;
  if (CLOUDINARY_CLOUD_NAME) return cloudinaryUrl(key, CLOUDINARY_CLOUD_NAME);
  return `${STORAGE_BASE}/${key}`;
};
