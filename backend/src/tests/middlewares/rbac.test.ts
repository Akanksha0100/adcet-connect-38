import { describe, expect, it } from "@jest/globals";
import { isOwnerOrAdmin, requireAdmin, requireRoles } from "../../middlewares/rbac.js";
import { ApiError } from "../../lib/errors.js";
import { buildNext, buildReq, buildRes } from "../helpers/expressMocks.js";

const auth = (roles: any[]) => ({ sub: "u-1", email: "a@b.com", roles, iat: 0, exp: 0 });

describe("middlewares/rbac", () => {
  describe("requireRoles", () => {
    it("401 when caller is unauthenticated", () => {
      const next = buildNext();
      requireRoles("ADMIN")(buildReq(), buildRes(), next);
      expect((next.mock.calls[0][0] as ApiError).status).toBe(401);
    });

    it("403 when caller has none of the allowed roles", () => {
      const req = buildReq();
      (req as any).auth = auth(["STUDENT"]);
      const next = buildNext();
      requireRoles("ADMIN")(req, buildRes(), next);
      expect((next.mock.calls[0][0] as ApiError).status).toBe(403);
    });

    it("passes when at least one role matches", () => {
      const req = buildReq();
      (req as any).auth = auth(["RECRUITER", "ALUMNI"]);
      const next = buildNext();
      requireRoles("ALUMNI", "ADMIN")(req, buildRes(), next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requireAdmin", () => {
    it("only ADMIN passes", () => {
      const reqAdmin = buildReq();
      (reqAdmin as any).auth = auth(["ADMIN"]);
      const ok = buildNext();
      requireAdmin(reqAdmin, buildRes(), ok);
      expect(ok).toHaveBeenCalledWith();

      const reqAlumni = buildReq();
      (reqAlumni as any).auth = auth(["ALUMNI"]);
      const denied = buildNext();
      requireAdmin(reqAlumni, buildRes(), denied);
      expect((denied.mock.calls[0][0] as ApiError).status).toBe(403);
    });
  });

  describe("isOwnerOrAdmin", () => {
    it("true when caller's sub matches ownerId", () => {
      const req = buildReq();
      (req as any).auth = auth(["ALUMNI"]);
      expect(isOwnerOrAdmin(req, "u-1")).toBe(true);
    });
    it("true when caller is admin even if not owner", () => {
      const req = buildReq();
      (req as any).auth = auth(["ADMIN"]);
      expect(isOwnerOrAdmin(req, "someone-else")).toBe(true);
    });
    it("false when caller is anonymous", () => {
      expect(isOwnerOrAdmin(buildReq(), "u-1")).toBe(false);
    });
    it("false when caller is neither owner nor admin", () => {
      const req = buildReq();
      (req as any).auth = auth(["STUDENT"]);
      expect(isOwnerOrAdmin(req, "other")).toBe(false);
    });
  });
});