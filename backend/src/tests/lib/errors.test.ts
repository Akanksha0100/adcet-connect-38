import { describe, expect, it } from "@jest/globals";
import {
  ApiError,
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  TooMany,
  Unauthorized,
  Unprocessable,
} from "../../lib/errors.js";

describe("lib/errors", () => {
  it("ApiError carries status, code, message and optional details", () => {
    const e = new ApiError(418, "TEAPOT", "I'm a teapot", { hint: "use coffee" });
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(418);
    expect(e.code).toBe("TEAPOT");
    expect(e.message).toBe("I'm a teapot");
    expect(e.details).toEqual({ hint: "use coffee" });
  });

  it.each([
    [BadRequest, 400, "BAD_REQUEST"],
    [Unauthorized, 401, "UNAUTHORIZED"],
    [Forbidden, 403, "FORBIDDEN"],
    [NotFound, 404, "NOT_FOUND"],
    [Conflict, 409, "CONFLICT"],
    [Unprocessable, 422, "UNPROCESSABLE"],
    [TooMany, 429, "TOO_MANY_REQUESTS"],
  ])("%p maps to status %i / code %s", (factory, status, code) => {
    const err = (factory as any)("oops");
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe("oops");
  });

  it("default messages are non-empty", () => {
    expect(NotFound().message).toBeTruthy();
    expect(BadRequest().message).toBeTruthy();
  });
});