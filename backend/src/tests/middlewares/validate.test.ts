import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { validate } from "../../middlewares/validate.js";
import { ApiError } from "../../lib/errors.js";
import { buildNext, buildReq, buildRes } from "../helpers/expressMocks.js";

const schema = z.object({ name: z.string().min(1), age: z.coerce.number() });

describe("middlewares/validate", () => {
  it("replaces req.body with the parsed (coerced) value on success", () => {
    const req = buildReq({ body: { name: "Ada", age: "30" } });
    const next = buildNext();
    validate(schema)(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect((req as any).body).toEqual({ name: "Ada", age: 30 });
  });

  it("forwards an Unprocessable error with flattened details on failure", () => {
    const req = buildReq({ body: { name: "", age: "x" } });
    const next = buildNext();
    validate(schema)(req, buildRes(), next);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.status).toBe(422);
    expect(err.code).toBe("UNPROCESSABLE");
    expect(err.details).toBeDefined();
  });

  it("can validate a different request slot (query)", () => {
    const req = buildReq({ query: { name: "x", age: "1" } as any });
    const next = buildNext();
    validate(schema, "query")(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect((req as any).query).toEqual({ name: "x", age: 1 });
  });
});