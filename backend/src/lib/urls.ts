/**
 * URL validation for every link a user can store and the app later renders as
 * an `<a href>`.
 *
 * `z.string().url()` is **not** enough on its own: Zod implements it as
 * `new URL(value)`, which happily accepts any scheme — including
 * `javascript:alert(document.cookie)` and `data:text/html,<script>…</script>`.
 * Such a value stored on an achievement, job or event is rendered straight into
 * an anchor by the frontend, so a member could get script running in an admin's
 * browser (and, once approved, in every anonymous visitor's) with nothing more
 * than a form submission. React's escaping does not help — it escapes text, not
 * URL schemes.
 *
 * The fix is an allowlist: only `http:` and `https:` links may be stored. Use
 * `httpUrl()` for every user-supplied link and never `z.string().url()` again.
 */
import { z } from "zod";

/** Schemes an `<a href>` built from stored data is allowed to use. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * True when `value` is an absolute URL the app may safely put in an `href`.
 * Exported so tests and the frontend mirror can assert the same rule.
 */
export const isHttpUrl = (value: string): boolean => {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

/**
 * An absolute `http(s)` URL. `max` bounds the stored length, matching the
 * column it feeds.
 */
export const httpUrl = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(isHttpUrl, { message: "Must be an http(s) URL" });
