/**
 * The esteemed roster is a hand-transcribed copy of
 * `public/EsteemedAlumni/Alumni.md`. These tests keep the copy honest: every
 * portrait path resolves to a file that exists, every alumnus is categorised,
 * and the batch and designation shown match the ones the Alumni Cell published.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ESTEEMED_ALUMNI, ESTEEMED_CATEGORIES, esteemedByCategory } from "./esteemed";

const publicDir = resolve(__dirname, "../../public");

/** Designation + batch from Alumni.md, keyed by a loosened form of the name. */
const loosen = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z]/g, "");

const alumniMd = (() => {
  const raw = readFileSync(resolve(publicDir, "EsteemedAlumni/Alumni.md"), "utf8");
  const rows = new Map<string, { position: string; batch: string }>();
  for (const line of raw.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // | # | Photo | Name | Designation | Batch |  (the last `|` is optional)
    if (cells.length < 6 || !/^\d+$/.test(cells[1])) continue;
    rows.set(loosen(cells[3]), { position: cells[4], batch: cells[5] });
  }
  return rows;
})();

describe("esteemed roster", () => {
  it("transcribes every row of Alumni.md", () => {
    expect(alumniMd.size).toBe(30);
    expect(ESTEEMED_ALUMNI).toHaveLength(alumniMd.size);
  });

  it("has a portrait on disk for everyone", () => {
    for (const a of ESTEEMED_ALUMNI) {
      expect(a.photo, `${a.name} has no photo`).toBeTruthy();
      expect(existsSync(resolve(publicDir, a.photo.replace(/^\//, ""))), `missing file for ${a.name}: ${a.photo}`).toBe(true);
    }
  });

  it("gives everyone a name, a batch and a designation, and nothing else to render", () => {
    for (const a of ESTEEMED_ALUMNI) {
      expect(a.name.trim()).not.toBe("");
      expect(a.position.trim(), `${a.name} has no designation`).not.toBe("");
      expect(a.batch, `${a.name} has an implausible batch`).toBeGreaterThan(1990);
      // Department is recorded in Alumni.md, never modelled here.
      expect(a).not.toHaveProperty("department");
    }
  });

  it("keeps each batch and designation as the office published it", () => {
    for (const a of ESTEEMED_ALUMNI) {
      const published = alumniMd.get(loosen(a.name));
      expect(published, `${a.name} is not in Alumni.md`).toBeDefined();
      // Punctuation is tidied (e.g. a missing comma), wording is not.
      expect(a.position.replace(/[.,]/g, "").toLowerCase()).toBe(
        published!.position.replace(/[.,]/g, "").toLowerCase(),
      );
      expect(String(a.batch), `${a.name} has the wrong batch`).toBe(published!.batch);
    }
  });

  it("files everyone under exactly one of the three categories", () => {
    const ids = ESTEEMED_CATEGORIES.map((c) => c.id);
    const covered = ids.flatMap((id) => esteemedByCategory(id).map((a) => a.name));

    for (const a of ESTEEMED_ALUMNI) expect(ids).toContain(a.category);
    // Every alumnus appears once across the three sections, so the page needs
    // no separate "all" roll and shows nobody twice.
    expect(covered.sort()).toEqual(ESTEEMED_ALUMNI.map((a) => a.name).sort());
    for (const id of ids) expect(esteemedByCategory(id).length).toBeGreaterThan(0);
  });

  it("uses unique names, since they key the rendered lists", () => {
    const names = ESTEEMED_ALUMNI.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("leads with the most senior alumni, which is what the strip shows first", () => {
    const top = ESTEEMED_ALUMNI.slice(0, 6).map((a) => a.position);
    for (const p of top) {
      expect(p).toMatch(/CEO|Managing Director|Founder|Director/i);
    }
  });
});
