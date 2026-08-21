/**
 * Exports go to an admin's spreadsheet, and half the columns are values members
 * typed into a sign-up form. Formula-triggering cells must arrive as text.
 * Mirrors `csvCell` in `backend/src/modules/admin/admin.service.ts`.
 */
import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it.each(['=HYPERLINK("http://evil","Open")', "+1+1", "-2+3", "@SUM(A1:A9)", "\tx", "\rx"])(
    "prefixes a quote to neutralise %j",
    (payload) => {
      const out = csvCell(payload);
      expect(out.startsWith("'") || out.startsWith('"\'')).toBe(true);
    },
  );

  it("leaves ordinary text alone", () => {
    expect(csvCell("Alice Kulkarni")).toBe("Alice Kulkarni");
    expect(csvCell(2020)).toBe("2020");
    expect(csvCell(null)).toBe("");
  });

  it("still quotes commas, quotes and newlines", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("one\ntwo")).toBe('"one\ntwo"');
  });
});

describe("toCsv", () => {
  it("returns an empty string with no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row from the first row's keys", () => {
    const csv = toCsv([{ Name: "Alice", City: "Pune" }, { Name: "=cmd|'/c calc'!A1", City: "Sangli" }]);
    const [header, first, second] = csv.split("\n");
    expect(header).toBe("Name,City");
    expect(first).toBe("Alice,Pune");
    expect(second).toBe("'=cmd|'/c calc'!A1,Sangli");
  });
});
