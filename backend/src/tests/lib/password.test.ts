import { describe, expect, it } from "@jest/globals";
import { hashPassword, verifyPassword } from "../../lib/password.js";

describe("lib/password", () => {
  it("hashes are non-reversible and salted (different each call)", async () => {
    const a = await hashPassword("Secret123!");
    const b = await hashPassword("Secret123!");
    expect(a).not.toBe("Secret123!");
    expect(a).not.toBe(b);
  });

  it("verifyPassword returns true for matching plaintext", async () => {
    const hash = await hashPassword("Secret123!");
    expect(await verifyPassword("Secret123!", hash)).toBe(true);
  });

  it("verifyPassword returns false for wrong plaintext", async () => {
    const hash = await hashPassword("Secret123!");
    expect(await verifyPassword("nope", hash)).toBe(false);
  });
}, 20_000);