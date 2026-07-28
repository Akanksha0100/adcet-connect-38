/**
 * `storageUrl` has to reproduce, client-side, the exact URL each backend
 * storage driver stores an object at. The Cloudinary cases mirror
 * `backend/src/tests/storage/CloudinaryStorage.test.ts` — if one changes, both do.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadStorage = () => import("@/lib/storage");

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe("storageUrl — bucket drivers", () => {
  it("joins the public base URL and the key", async () => {
    vi.stubEnv("VITE_STORAGE_PUBLIC_BASE_URL", "http://localhost:9000/adcet-alumni");
    const { storageUrl } = await loadStorage();
    expect(storageUrl("avatar/u1/abc-photo.png")).toBe(
      "http://localhost:9000/adcet-alumni/avatar/u1/abc-photo.png",
    );
  });

  it("returns undefined for a missing key", async () => {
    const { storageUrl } = await loadStorage();
    expect(storageUrl(null)).toBeUndefined();
    expect(storageUrl(undefined)).toBeUndefined();
    expect(storageUrl("")).toBeUndefined();
  });
});

describe("storageUrl — Cloudinary", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo-cloud");
    vi.stubEnv("VITE_STORAGE_PUBLIC_BASE_URL", "");
  });

  it("routes images and video through their resource types", async () => {
    const { storageUrl } = await loadStorage();
    expect(storageUrl("avatar/u1/abc-photo.png")).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/avatar/u1/abc-photo.png",
    );
    expect(storageUrl("post/u1/abc-clip.mp4")).toBe(
      "https://res.cloudinary.com/demo-cloud/video/upload/post/u1/abc-clip.mp4",
    );
  });

  it("treats anything else as raw, keeping the extension in the public id", async () => {
    const { storageUrl } = await loadStorage();
    expect(storageUrl("achievement/u1/abc-cert.pdf")).toBe(
      "https://res.cloudinary.com/demo-cloud/raw/upload/achievement/u1/abc-cert.pdf",
    );
    expect(storageUrl("achievement/u1/abc-notes")).toBe(
      "https://res.cloudinary.com/demo-cloud/raw/upload/achievement/u1/abc-notes",
    );
  });

  it("prefixes the configured folder", async () => {
    vi.stubEnv("VITE_CLOUDINARY_FOLDER", "/adcet/prod/");
    const { storageUrl } = await loadStorage();
    expect(storageUrl("avatar/u1/abc-photo.png")).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/adcet/prod/avatar/u1/abc-photo.png",
    );
  });
});
