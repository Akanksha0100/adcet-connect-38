/**
 * Storage abstraction. All file I/O in the app goes through this interface.
 * Swap providers (MinIO / S3 / local disk / future GCS, Azure Blob...) without
 * touching business logic — controlled by env `STORAGE_DRIVER`.
 */

export type UploadScope = "avatar" | "banner" | "event" | "achievement" | "receipt" | "resume";

export interface PresignUploadInput {
  fileName: string;
  contentType: string;
  scope: UploadScope;
  /** Optional owner id used to namespace the object key. */
  ownerId?: string;
}

export interface PresignUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export interface StorageService {
  /** Returns a pre-signed URL the client can PUT a file to directly. */
  presignUpload(input: PresignUploadInput): Promise<PresignUploadResult>;

  /** Uploads bytes through the backend and returns the stored object key. */
  upload(input: PresignUploadInput & { body: Buffer }): Promise<{ key: string; publicUrl: string }>;

  /** Pre-signed GET URL for private objects. */
  presignDownload(key: string, expiresIn?: number): Promise<string>;

  /** Stable public URL for an object (when bucket allows public reads). */
  publicUrl(key: string): string;

  /** Delete an object. No-op if missing. */
  delete(key: string): Promise<void>;
}

/** Build a deterministic object key like `avatar/<owner>/<uuid>-<file>`. */
export const buildObjectKey = (input: PresignUploadInput) => {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const id = crypto.randomUUID();
  const owner = input.ownerId ?? "anon";
  return `${input.scope}/${owner}/${id}-${safeName}`;
};
