/**
 * Cloudinary adapter tests.
 *
 * Focus on the pure key → (resource_type, public_id, URL) mapping, since that is
 * what `publicUrl()`/`delete()` must reproduce from a bare key read out of the
 * DB, plus the shape of the signed browser-upload payload. No network calls: the
 * signing helpers are deterministic and `destroy`/`upload_stream` are mocked.
 */
import { beforeAll, describe, expect, it, jest } from "@jest/globals";

process.env.STORAGE_DRIVER = "cloudinary";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:test-api-secret@demo-cloud";
delete process.env.STORAGE_PUBLIC_BASE_URL;

let storage: import("../../storage/CloudinaryStorage.js").CloudinaryStorage;
let resourceTypeForKey: typeof import("../../storage/CloudinaryStorage.js").resourceTypeForKey;
let destroy: ReturnType<typeof jest.spyOn>;

beforeAll(async () => {
  // Spy on the live SDK rather than mocking the module — the adapter shares this
  // exact `v2` object, and the signing helpers must stay real to be verifiable.
  const { v2 } = await import("cloudinary");
  destroy = jest.spyOn(v2.uploader, "destroy").mockResolvedValue({ result: "ok" } as never);

  const mod = await import("../../storage/CloudinaryStorage.js");
  ({ resourceTypeForKey } = mod);
  storage = new mod.CloudinaryStorage();
});

describe("CloudinaryStorage — key mapping", () => {
  it("derives the resource type from the extension, not the content type", () => {
    expect(resourceTypeForKey("avatar/u1/abc-photo.PNG")).toBe("image");
    expect(resourceTypeForKey("post/u1/abc-clip.mp4")).toBe("video");
    expect(resourceTypeForKey("post/u1/abc-voice.mp3")).toBe("video");
    expect(resourceTypeForKey("resume/u1/abc-cv.pdf")).toBe("raw");
    expect(resourceTypeForKey("event-attachment/u1/abc-notes")).toBe("raw");
  });

  it("strips the extension from image public ids and re-adds it as the delivery format", () => {
    expect(storage.publicUrl("avatar/u1/abc-photo.png")).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/avatar/u1/abc-photo.png",
    );
    expect(storage.publicUrl("post/u1/abc-clip.mp4")).toBe(
      "https://res.cloudinary.com/demo-cloud/video/upload/post/u1/abc-clip.mp4",
    );
  });

  it("keeps the extension inside raw public ids", () => {
    expect(storage.publicUrl("event-attachment/u1/abc-notes.pdf")).toBe(
      "https://res.cloudinary.com/demo-cloud/raw/upload/event-attachment/u1/abc-notes.pdf",
    );
  });
});

describe("CloudinaryStorage — presignUpload", () => {
  it("returns a multipart POST target with signed fields", async () => {
    const r = await storage.presignUpload({
      fileName: "My Photo!.png",
      contentType: "image/png",
      scope: "avatar",
      ownerId: "user-1",
    });

    expect(r.method).toBe("POST");
    expect(r.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    expect(r.key).toMatch(/^avatar\/user-1\/[0-9a-f-]+-My_Photo_\.png$/);
    // Public id drops the .png that the delivery URL adds back.
    expect(r.fields?.public_id).toBe(r.key.replace(/\.png$/, ""));
    expect(r.fields?.type).toBe("upload");
    expect(r.fields?.api_key).toBe("123456789012345");
    expect(r.fields?.signature).toMatch(/^[0-9a-f]{40}$/);
    expect(r.expiresIn).toBe(900);
  });

  it("signs exactly the fields it sends, so Cloudinary accepts the upload", async () => {
    const { v2 } = await import("cloudinary");
    const r = await storage.presignUpload({
      fileName: "clip.mp4",
      contentType: "video/mp4",
      scope: "post",
      ownerId: "user-2",
    });
    const { api_key: _apiKey, signature, ...signed } = r.fields!;
    expect(v2.utils.api_sign_request(signed, "test-api-secret")).toBe(signature);
  });

  it("uploads sensitive scopes as private assets", async () => {
    const r = await storage.presignUpload({
      fileName: "cv.pdf",
      contentType: "application/pdf",
      scope: "resume",
      ownerId: "user-3",
    });
    expect(r.fields?.type).toBe("private");
    expect(r.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo-cloud/raw/upload");
  });
});

describe("CloudinaryStorage — downloads and deletes", () => {
  it("hands private keys a signed, expiring download URL instead of a CDN URL", async () => {
    const url = await storage.presignDownload("resume/u1/abc-cv.pdf", 600);
    expect(url).toContain("https://api.cloudinary.com/v1_1/demo-cloud/raw/download");
    expect(url).toContain("signature=");
    const expiresAt = Number(new URL(url).searchParams.get("expires_at"));
    expect(expiresAt).toBeGreaterThan(Date.now() / 1000 + 500);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() / 1000 + 600);
  });

  it("returns the plain CDN URL for public keys", async () => {
    expect(await storage.presignDownload("avatar/u1/abc-photo.png")).toBe(
      storage.publicUrl("avatar/u1/abc-photo.png"),
    );
  });

  it("caps the signed TTL at Cloudinary's one-hour signature limit", async () => {
    const url = await storage.presignDownload("resume/u1/abc-cv.pdf", 86400);
    const expiresAt = Number(new URL(url).searchParams.get("expires_at"));
    expect(expiresAt).toBeLessThanOrEqual(Date.now() / 1000 + 3600);
  });

  it("destroys the same public id and resource type it uploaded to", async () => {
    destroy.mockClear();
    await storage.delete("post/u1/abc-clip.mp4");
    expect(destroy).toHaveBeenCalledWith(
      "post/u1/abc-clip",
      expect.objectContaining({ resource_type: "video", type: "upload", invalidate: true }),
    );
  });
});
