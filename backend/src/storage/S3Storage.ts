/**
 * S3-compatible storage adapter. Works with AWS S3 or any S3-compatible service
 * (MinIO, Cloudflare R2, Backblaze B2). Selection is driven by `S3_ENDPOINT`
 * + `S3_FORCE_PATH_STYLE` in env.
 */
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import {
  buildObjectKey,
  type PresignUploadInput,
  type PresignUploadResult,
  type StorageService,
} from "./StorageService.js";

export class S3Storage implements StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.STORAGE_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT && { endpoint: env.S3_ENDPOINT }),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      ...(env.S3_ACCESS_KEY && env.S3_SECRET_KEY
        ? { credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } }
        : {}),
    });
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    const key = buildObjectKey(input);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: env.S3_PRESIGN_TTL });
    return { uploadUrl, key, publicUrl: this.publicUrl(key), expiresIn: env.S3_PRESIGN_TTL };
  }

  async presignDownload(key: string, expiresIn = env.S3_PRESIGN_TTL): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  publicUrl(key: string): string {
    if (env.STORAGE_PUBLIC_BASE_URL) return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
    if (env.S3_ENDPOINT) return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}