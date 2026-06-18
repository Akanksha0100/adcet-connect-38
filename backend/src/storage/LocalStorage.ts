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
    const full = path.join(this.root, key);
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
    const full = path.join(this.root, key);
    if (existsSync(full)) await rm(full, { force: true });
  }

  private baseUrl() {
    return env.STORAGE_PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`;
  }
}
