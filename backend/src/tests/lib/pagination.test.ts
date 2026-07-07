import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import {
  booleanQueryParam,
  paginate,
  paginationMeta,
  paginationSchema,
} from "../../lib/pagination.js";

describe("lib/pagination", () => {
  describe("paginationSchema", () => {
    it("applies sensible defaults when nothing is provided", () => {
      expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    });

    it("coerces string query params to numbers", () => {
      expect(paginationSchema.parse({ page: "3", pageSize: "5" })).toEqual({
        page: 3,
        pageSize: 5,
      });
    });

    it("rejects pageSize over MAX_PAGE_SIZE (100)", () => {
      expect(() => paginationSchema.parse({ pageSize: 999 })).toThrow();
    });

    it("rejects non-positive pages", () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });
  });

  describe("booleanQueryParam", () => {
    const schema = z.object({ flag: booleanQueryParam });

    it("parses the string 'false' as false (regression: coerce.boolean() got this wrong)", () => {
      expect(schema.parse({ flag: "false" }).flag).toBe(false);
      expect(schema.parse({ flag: "0" }).flag).toBe(false);
    });

    it("parses the string 'true' as true", () => {
      expect(schema.parse({ flag: "true" }).flag).toBe(true);
      expect(schema.parse({ flag: "1" }).flag).toBe(true);
    });

    it("passes through real booleans", () => {
      expect(schema.parse({ flag: true }).flag).toBe(true);
      expect(schema.parse({ flag: false }).flag).toBe(false);
    });

    it("is undefined when absent or unrecognized", () => {
      expect(schema.parse({}).flag).toBeUndefined();
      expect(schema.parse({ flag: "maybe" }).flag).toBeUndefined();
    });
  });

  describe("paginate", () => {
    it("computes skip/take from page+pageSize", () => {
      expect(paginate({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
      expect(paginate({ page: 3, pageSize: 25 })).toEqual({ skip: 50, take: 25 });
    });
  });

  describe("paginationMeta", () => {
    it("computes totalPages with ceil and floor of 1", () => {
      expect(paginationMeta(0, { page: 1, pageSize: 20 })).toEqual({
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
      expect(paginationMeta(45, { page: 2, pageSize: 20 })).toMatchObject({
        total: 45,
        totalPages: 3,
      });
    });
  });
});