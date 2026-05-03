import { describe, expect, it, jest } from "@jest/globals";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { ApiError } from "../../lib/errors.js";
import { buildNext, buildReq, buildRes } from "../helpers/expressMocks.js";

describe("middlewares/errorHandler", () => {
  it("maps ApiError to its declared status + body shape", () => {
    const res = buildRes();
    errorHandler(new ApiError(403, "FORBIDDEN", "no", { x: 1 }), buildReq(), res, buildNext());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "FORBIDDEN", message: "no", details: { x: 1 } },
    });
  });

  it("maps ZodError to 422 UNPROCESSABLE", () => {
    const res = buildRes();
    const err = new ZodError([
      { code: "custom", message: "bad", path: ["x"] } as any,
    ]);
    errorHandler(err, buildReq(), res, buildNext());
    expect(res.status).toHaveBeenCalledWith(422);
    expect((res._json as any).error.code).toBe("UNPROCESSABLE");
  });

  it("maps Prisma P2002 (unique violation) to 409 CONFLICT", () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
      meta: { target: ["email"] },
    } as any);
    errorHandler(err, buildReq(), res, buildNext());
    expect(res.status).toHaveBeenCalledWith(409);
    expect((res._json as any).error.code).toBe("CONFLICT");
  });

  it("maps Prisma P2025 (record not found) to 404 NOT_FOUND", () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError("missing", {
      code: "P2025",
      clientVersion: "x",
    } as any);
    errorHandler(err, buildReq(), res, buildNext());
    expect(res.status).toHaveBeenCalledWith(404);
    expect((res._json as any).error.code).toBe("NOT_FOUND");
  });

  it("falls back to 500 INTERNAL for unknown errors", () => {
    const res = buildRes();
    errorHandler(new Error("kaboom"), buildReq(), res, buildNext());
    expect(res.status).toHaveBeenCalledWith(500);
    expect((res._json as any).error.code).toBe("INTERNAL");
  });
});