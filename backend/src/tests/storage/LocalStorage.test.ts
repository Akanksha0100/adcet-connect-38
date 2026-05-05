/**
 * LocalStorage adapter tests.
 *
 * Covers key sanitization, presigned-style URL shape, public URL building,
 * and the silent no-op behaviour of `delete()` for missing files.
 */
import { afterAll, describe, expect, it } from "@jest/globals";
import path from "node:path";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "lstor-"));
process.env.LOCAL_STORAGE_DIR = tmpDir;
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_PUBLIC_BASE_URL = "http://example.test";

const { LocalStorage } = await import("../../storage/LocalStorage.js");
const { buildObjectKey } = await import("../../storage/StorageService.js");
const storage = new LocalStorage();

afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

describe("LocalStorage", () => {
  it("presignUpload namespaces by scope/owner, sanitizes filename, expires in 900s", async () => {
    const r = await storage.presignUpload({
      fileName: "Résumé final!.pdf",
      contentType: "application/pdf",
      scope: "resume",
      ownerId: "user-1",
    });
    expect(r.key.startsWith("resume/user-1/")).toBe(true);
    expect(r.key).toMatch(/R_sum__final_\.pdf$/);
    expect(r.expiresIn).toBe(900);
    expect(r.uploadUrl).toContain("/__local_upload/");
    expect(r.publicUrl).toBe(`http://example.test/uploads/${r.key}`);
  });

  it("buildObjectKey replaces unsafe characters and uses 'anon' when no owner", () => {
    const key = buildObjectKey({ fileName: "a/b c.png", contentType: "image/png", scope: "avatar" });
    expect(key.startsWith("avatar/anon/")).toBe(true);
    expect(key).toMatch(/a_b_c\.png$/);
  });

  it("delete() is a no-op for files that do not exist", async () => {
    await expect(storage.delete("nope/missing.txt")).resolves.toBeUndefined();
  });

  it("delete() removes a file when present", async () => {
    const key = "achievement/u/x.txt";
    const full = path.join(tmpDir, key);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "hi");
    expect(existsSync(full)).toBe(true);
    await storage.delete(key);
    expect(existsSync(full)).toBe(false);
  });

  it("presignDownload returns the same publicUrl for the key", async () => {
    const url = await storage.presignDownload("avatar/u/x.png");
    expect(url).toBe("http://example.test/uploads/avatar/u/x.png");
  });
});
