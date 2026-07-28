/**
 * Cloudinary storage adapter — enable with `STORAGE_DRIVER=cloudinary`.
 *
 * Cloudinary has no S3-style pre-signed `PUT`; browsers upload with a signed
 * `multipart/form-data` POST to `api.cloudinary.com`. `presignUpload()` therefore
 * returns `method: "POST"` plus the signed `fields`, and the frontend helper
 * (`src/lib/upload.ts`) submits them. Bytes still go straight from the browser to
 * Cloudinary — the API process never proxies uploads.
 *
 * Object keys stay the app's own (`<scope>/<owner>/<uuid>-<file>`); the mapping
 * key → (resource_type, public_id, delivery URL) below is a pure function of the
 * key, so `publicUrl()` and `delete()` work from a bare key read out of the DB.
 * `src/lib/storage.ts` in the frontend mirrors it to render images client-side —
 * keep the two in sync.
 */
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryConfig, env } from "../config/env.js";
import {
  buildObjectKey,
  type PresignUploadInput,
  type PresignUploadResult,
  type StorageService,
} from "./StorageService.js";

export type CloudinaryResourceType = "image" | "video" | "raw";

/** Cloudinary serves audio under the `video` resource type. */
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "ico", "tif", "tiff", "heic", "heif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "3gp", "flv", "mp3", "wav", "aac", "m4a", "ogg", "flac"]);

/** Cloudinary signatures are rejected after an hour regardless of our TTL. */
const MAX_SIGNATURE_TTL = 3600;

/** Lowercased extension of an object key, or "" when it has none. */
export const keyExtension = (key: string): string => {
  const base = key.slice(key.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
};

/**
 * Derived from the extension only — never from the declared content type — so
 * upload, delivery and delete always agree on where an object lives.
 */
export const resourceTypeForKey = (key: string): CloudinaryResourceType => {
  const ext = keyExtension(key);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return "raw";
};

/** First path segment of a key is its `UploadScope`. */
export const scopeOfKey = (key: string): string => key.slice(0, Math.max(0, key.indexOf("/")));

export class CloudinaryStorage implements StorageService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private folder: string;
  private privateScopes: Set<string>;

  constructor() {
    if (!cloudinaryConfig) {
      throw new Error(
        "Cloudinary is not configured — set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET",
      );
    }
    this.cloudName = cloudinaryConfig.cloudName;
    this.apiKey = cloudinaryConfig.apiKey;
    this.apiSecret = cloudinaryConfig.apiSecret;
    this.folder = (env.CLOUDINARY_FOLDER ?? "").replace(/^\/+|\/+$/g, "");
    this.privateScopes = new Set(
      env.CLOUDINARY_PRIVATE_SCOPES.split(",").map((s) => s.trim()).filter(Boolean),
    );
    cloudinary.config({ cloud_name: this.cloudName, api_key: this.apiKey, api_secret: this.apiSecret, secure: true });
  }

  /** Credentials passed explicitly on every call so we never depend on global SDK state. */
  private get creds() {
    return { cloud_name: this.cloudName, api_key: this.apiKey, api_secret: this.apiSecret };
  }

  /**
   * Image/video public ids carry no extension (Cloudinary appends the delivery
   * format); raw ones keep it so the id round-trips the key exactly.
   */
  private publicId(key: string): string {
    const ext = keyExtension(key);
    const stripped = resourceTypeForKey(key) === "raw" || !ext ? key : key.slice(0, -(ext.length + 1));
    return this.folder ? `${this.folder}/${stripped}` : stripped;
  }

  /** Sensitive scopes (resumes, receipts) are stored `private` — no public delivery URL exists. */
  private deliveryType(key: string): "upload" | "private" {
    return this.privateScopes.has(scopeOfKey(key)) ? "private" : "upload";
  }

  private ttl(requested?: number): number {
    return Math.min(requested ?? env.CLOUDINARY_PRESIGN_TTL, MAX_SIGNATURE_TTL);
  }

  /** Signed, expiring link to Cloudinary's download API — the `private` equivalent of a pre-signed GET. */
  private privateDownloadUrl(key: string, expiresIn: number): string {
    const ext = keyExtension(key);
    const resourceType = resourceTypeForKey(key);
    return cloudinary.utils.private_download_url(
      this.publicId(key),
      resourceType === "raw" ? "" : ext,
      {
        ...this.creds,
        resource_type: resourceType,
        type: "private",
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      },
    );
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    const key = buildObjectKey(input);
    const resourceType = resourceTypeForKey(key);
    const expiresIn = this.ttl();

    // Every field except `file`, `api_key` and `signature` must be signed.
    const signed = {
      public_id: this.publicId(key),
      timestamp: Math.floor(Date.now() / 1000),
      type: this.deliveryType(key),
    };
    const signature = cloudinary.utils.api_sign_request(signed, this.apiSecret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
      method: "POST",
      fields: {
        public_id: signed.public_id,
        timestamp: String(signed.timestamp),
        type: signed.type,
        api_key: this.apiKey,
        signature,
      },
      key,
      publicUrl: this.publicUrl(key),
      expiresIn,
    };
  }

  async upload(input: PresignUploadInput & { body: Buffer }): Promise<{ key: string; publicUrl: string }> {
    const key = buildObjectKey(input);
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          ...this.creds,
          public_id: this.publicId(key),
          resource_type: resourceTypeForKey(key),
          type: this.deliveryType(key),
        },
        (err) => (err ? reject(err) : resolve()),
      );
      stream.end(input.body);
    });
    return { key, publicUrl: this.publicUrl(key) };
  }

  async presignDownload(key: string, expiresIn = env.CLOUDINARY_PRESIGN_TTL): Promise<string> {
    if (this.deliveryType(key) === "private") return this.privateDownloadUrl(key, this.ttl(expiresIn));
    return this.publicUrl(key);
  }

  publicUrl(key: string): string {
    // Private assets have no CDN URL; hand back a signed, expiring one instead.
    if (this.deliveryType(key) === "private") return this.privateDownloadUrl(key, this.ttl());
    // A blank STORAGE_PUBLIC_BASE_URL means "unset" — fall back to the CDN host.
    const base = (env.STORAGE_PUBLIC_BASE_URL?.trim() || `https://res.cloudinary.com/${this.cloudName}`).replace(/\/$/, "");
    const resourceType = resourceTypeForKey(key);
    const ext = keyExtension(key);
    const suffix = resourceType === "raw" || !ext ? "" : `.${ext}`;
    return `${base}/${resourceType}/upload/${this.publicId(key)}${suffix}`;
  }

  async delete(key: string): Promise<void> {
    // `destroy` is idempotent — a missing public id comes back as "not found", not an error.
    await cloudinary.uploader.destroy(this.publicId(key), {
      ...this.creds,
      resource_type: resourceTypeForKey(key),
      type: this.deliveryType(key),
      invalidate: true,
    });
  }
}
