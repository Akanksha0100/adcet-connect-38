/**
 * Public base URL for storage objects. Object keys returned by the API are
 * relative to this (e.g. `post/<uid>/<uuid>-clip.mp4`).
 */
export const STORAGE_BASE =
  (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
  "http://localhost:9000/adcet-alumni";

/** Resolve a storage object key to a browsable URL. */
export const storageUrl = (key?: string | null) => (key ? `${STORAGE_BASE}/${key}` : undefined);
