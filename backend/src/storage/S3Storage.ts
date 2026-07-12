/**
 * S3-compatible storage adapter. Works with AWS S3 or any S3-compatible service
 * (MinIO, Cloudflare R2, Backblaze B2). Selection is driven by `S3_ENDPOINT`
 * + `S3_FORCE_PATH_STYLE` in env.
 */
import {
  S3Client,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  buildObjectKey,
  type PresignUploadInput,
  type PresignUploadResult,
  type StorageService,
} from "./StorageService.js";

export class S3Storage implements StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(opts?: { ensureBucket?: boolean }) {
    this.bucket = env.STORAGE_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT && { endpoint: env.S3_ENDPOINT }),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      ...(env.S3_ACCESS_KEY && env.S3_SECRET_KEY
        ? { credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } }
        : {}),
    });
    this.shouldEnsureBucket = Boolean(opts?.ensureBucket);
    // Warm up eagerly, but don't fail the boot — ensureReady() retries on
    // every upload until it succeeds (MinIO may start after the backend).
    void this.ensureReady();
  }

  private shouldEnsureBucket: boolean;
  private bucketEnsured = false;
  private ensureInFlight: Promise<void> | null = null;

  /** Await bucket existence before serving uploads; retries across calls. */
  private async ensureReady(): Promise<void> {
    if (!this.shouldEnsureBucket || this.bucketEnsured) return;
    this.ensureInFlight ??= this.ensureBucket().finally(() => {
      this.ensureInFlight = null;
    });
    await this.ensureInFlight;
  }

  /**
   * Dev-MinIO convenience: create the bucket (with public read, mirroring the
   * docker-compose `createbuckets` job) if it doesn't exist. A fresh or
   * foreign MinIO instance on :9000 otherwise 404s every presigned upload.
   */
  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketEnsured = true;
      return;
    } catch {
      // Missing (or MinIO unreachable) — attempt to create below.
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        }),
      );
      this.bucketEnsured = true;
      logger.info(`[storage] created missing bucket "${this.bucket}" with public-read policy`);
    } catch (e) {
      logger.error({ err: e }, `[storage] could not verify/create bucket "${this.bucket}" — will retry on next upload`);
    }
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    await this.ensureReady();
    const key = buildObjectKey(input);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: env.S3_PRESIGN_TTL });
    return { uploadUrl, key, publicUrl: this.publicUrl(key), expiresIn: env.S3_PRESIGN_TTL };
  }

  async upload(input: PresignUploadInput & { body: Buffer }): Promise<{ key: string; publicUrl: string }> {
    await this.ensureReady();
    const key = buildObjectKey(input);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: input.contentType,
        Body: input.body,
      }),
    );
    return { key, publicUrl: this.publicUrl(key) };
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
