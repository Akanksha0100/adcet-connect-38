/**
 * Filesystem-backed storage for local dev when MinIO/S3 isn't running.
 * "Pre-signed URLs" are simply HTTP endpoints under `/uploads/*` served by Express.
 * Not for production use — but lets the backend run with zero external deps.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import {
  buildObjectKey,
  type PresignUploadInput,
  type PresignUploadResult,
  type StorageService,
} from "./StorageService.js";

export class LocalStorage implements StorageService {
  private root: string;

  /**
   * Resolve a key to an absolute path *inside* the storage root.
   *
   * `path.join(root, key)` on its own walks straight out of the root when the
   * key contains `..`, and keys reach `delete()` from a request body. The
   * uploads module rejects such keys before they get here; this is the second
   * lock, so no future caller can reintroduce the hole.
   */
  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error(`Refusing to touch a path outside the storage root: ${key}`);
    }
    return full;
  }

  constructor() {
    this.root = path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);
    if (!existsSync(this.root)) {
      mkdir(this.root, { recursive: true }).catch(() => undefined);
    }
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    const key = buildObjectKey(input);
    const uploadUrl = `${this.baseUrl()}/__local_upload/${encodeURIComponent(key)}`;
    return { uploadUrl, key, publicUrl: this.publicUrl(key), expiresIn: 900 };
  }

  async upload(input: PresignUploadInput & { body: Buffer }): Promise<{ key: string; publicUrl: string }> {
    const key = buildObjectKey(input);
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.body);
    return { key, publicUrl: this.publicUrl(key) };
  }

  async presignDownload(key: string): Promise<string> {
    return this.publicUrl(key);
  }

  publicUrl(key: string): string {
    return `${this.baseUrl()}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    if (existsSync(full)) await rm(full, { force: true });
  }

  private baseUrl() {
    return env.STORAGE_PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`;
  }
}
