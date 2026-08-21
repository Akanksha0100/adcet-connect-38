/**
 * The scheme allowlist that keeps `javascript:` out of stored links.
 *
 * `z.string().url()` is `new URL()` under the hood, so it accepts every scheme
 * the WHATWG parser knows. A stored `javascript:` link is rendered by the
 * frontend as an `<a href>` on the public achievement page and in the admin's
 * moderation queue — clicking it runs script in that origin. These tests pin
 * the allowlist so nobody widens it back.
 */
import { describe, expect, it } from "@jest/globals";
import { httpUrl, isHttpUrl } from "../../lib/urls.js";

const HOSTILE = [
  "javascript:alert(document.cookie)",
  "JavaScript:alert(1)",
  "  javascript:alert(1)  ",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "not a url at all",
];

describe("lib/urls", () => {
  describe("isHttpUrl", () => {
    it.each(["http://example.com", "https://example.com/a?b=c#d", "https://linkedin.com/in/alice"])(
      "accepts %s",
      (url) => expect(isHttpUrl(url)).toBe(true),
    );

    it.each(HOSTILE)("rejects %s", (url) => expect(isHttpUrl(url.trim())).toBe(false));
  });

  describe("httpUrl schema", () => {
    it("accepts an https URL and trims it", () => {
      expect(httpUrl().parse("  https://example.com  ")).toBe("https://example.com");
    });

    it.each(HOSTILE)("rejects %s", (url) => {
      expect(httpUrl().safeParse(url).success).toBe(false);
    });

    it("enforces the length bound", () => {
      expect(httpUrl(20).safeParse(`https://example.com/${"a".repeat(50)}`).success).toBe(false);
    });
  });
});
