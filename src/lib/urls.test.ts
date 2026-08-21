/**
 * `safeExternalUrl` is the last line between a hostile link stored in the
 * database and an `<a href>` in someone's browser. React escapes text, not URL
 * schemes, so without this a row written before the API's `httpUrl` check
 * landed would still be clickable script.
 */
import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./urls";

describe("safeExternalUrl", () => {
  it.each([
    "javascript:alert(document.cookie)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "nonsense",
  ])("drops the href for %s", (url) => {
    expect(safeExternalUrl(url)).toBeUndefined();
  });

  it.each([
    "https://example.com",
    "http://example.com/a?b=c#d",
    "https://linkedin.com/in/alice",
  ])("keeps %s", (url) => {
    expect(safeExternalUrl(url)).toBe(url);
  });

  it("keeps an in-app path but not a protocol-relative URL", () => {
    expect(safeExternalUrl("/dashboard/events/1")).toBe("/dashboard/events/1");
    expect(safeExternalUrl("//evil.example/x")).toBeUndefined();
  });

  it("returns undefined for empty values", () => {
    expect(safeExternalUrl(undefined)).toBeUndefined();
    expect(safeExternalUrl(null)).toBeUndefined();
    expect(safeExternalUrl("")).toBeUndefined();
  });
});
