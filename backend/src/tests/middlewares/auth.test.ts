import { describe, expect, it, jest } from "@jest/globals";
import { signAccessToken } from "../../lib/jwt.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { ApiError } from "../../lib/errors.js";
import { buildNext, buildReq, buildRes } from "../helpers/expressMocks.js";

const validToken = () =>
  signAccessToken({ sub: "u-1", email: "a@b.com", roles: ["ALUMNI"] });

describe("middlewares/auth — requireAuth", () => {
  it("calls next() with Unauthorized when no header is present", () => {
    const next = buildNext();
    requireAuth(buildReq(), buildRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
  });

  it("rejects malformed Authorization header (no Bearer prefix)", () => {
    const next = buildNext();
    requireAuth(
      buildReq({ headers: { authorization: "Basic xyz" } as any }),
      buildRes(),
      next,
    );
    expect((next.mock.calls[0][0] as ApiError).status).toBe(401);
  });

  it("rejects an invalid/expired token with 401", () => {
    const next = buildNext();
    requireAuth(
      buildReq({ headers: { authorization: "Bearer not.a.jwt" } as any }),
      buildRes(),
      next,
    );
    expect((next.mock.calls[0][0] as ApiError).status).toBe(401);
  });

  it("populates req.auth and calls next() on a valid token", () => {
    const req = buildReq({ headers: { authorization: `Bearer ${validToken()}` } as any });
    const next = buildNext();
    requireAuth(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect((req as any).auth?.sub).toBe("u-1");
  });
});

describe("middlewares/auth — optionalAuth", () => {
  it("never blocks the request when no token is supplied", () => {
    const next = buildNext();
    optionalAuth(buildReq(), buildRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("attaches req.auth when token is valid", () => {
    const req = buildReq({ headers: { authorization: `Bearer ${validToken()}` } as any });
    const next = buildNext();
    optionalAuth(req, buildRes(), next);
    expect((req as any).auth?.sub).toBe("u-1");
  });

  it("silently ignores invalid tokens", () => {
    const req = buildReq({ headers: { authorization: "Bearer broken" } as any });
    const next = buildNext();
    optionalAuth(req, buildRes(), next);
    expect((req as any).auth).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});