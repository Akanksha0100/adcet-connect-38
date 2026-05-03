import { describe, expect, it, jest } from "@jest/globals";
import { asyncHandler } from "../../lib/asyncHandler.js";

describe("lib/asyncHandler", () => {
  it("forwards rejected promises to next()", async () => {
    const err = new Error("boom");
    const handler = asyncHandler(async () => {
      throw err;
    });
    const next = jest.fn();
    await handler({} as any, {} as any, next as any);
    expect(next).toHaveBeenCalledWith(err);
  });

  it("does not call next() on success", async () => {
    const handler = asyncHandler(async (_req, res) => {
      (res as any).ok = true;
    });
    const next = jest.fn();
    const res: any = {};
    await handler({} as any, res, next as any);
    expect(next).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });
});