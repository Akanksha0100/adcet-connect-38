import { describe, expect, it } from "@jest/globals";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";

describe("lib/jwt", () => {
  const claims = { sub: "user-1", email: "a@b.com", roles: ["ALUMNI" as const] };

  it("round-trips an access token preserving claims", () => {
    const token = signAccessToken(claims);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.email).toBe(claims.email);
    expect(decoded.roles).toEqual(claims.roles);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("rejects access tokens signed with the wrong secret", () => {
    const token = signAccessToken(claims).slice(0, -2) + "xx";
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("issues unique refresh tokens (jti)", () => {
    const a = signRefreshToken("u-1");
    const b = signRefreshToken("u-1");
    expect(a).not.toBe(b);
    expect(verifyRefreshToken(a).sub).toBe("u-1");
    expect(verifyRefreshToken(a).jti).toBeTruthy();
  });

  it("hashToken is deterministic and not the input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe("abc");
    expect(hashToken("abc")).toHaveLength(64); // sha256 hex
  });
});