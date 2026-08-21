/**
 * Safe rendering of links that came from the database.
 *
 * The API now rejects anything that isn't `http(s)` on the way in
 * (`backend/src/lib/urls.ts`), but rows written before that check landed can
 * still hold a `javascript:` or `data:` URL — and React does not sanitise
 * `href`, it only escapes text. So every anchor built from stored data resolves
 * its URL through here: an unrecognised scheme yields `undefined`, which makes
 * React drop the attribute entirely and leaves an inert element behind.
 *
 * Keep the allowed schemes in step with the backend's `isHttpUrl`.
 */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * The URL if it is an absolute `http(s)` link, otherwise `undefined`.
 * Relative paths ("/dashboard/…") are the app's own routes and pass through.
 */
export const safeExternalUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(trimmed).protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
};
