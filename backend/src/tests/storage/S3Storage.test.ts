/**
 * S3Storage adapter tests with mocked AWS SDK — no real network calls.
 *
 * Asserts presign is invoked with the right Bucket/Key/ContentType, and that
 * `delete()` issues a `DeleteObjectCommand` against the configured bucket.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const sendMock = jest.fn().mockResolvedValue({} as never);
const getSignedUrlMock = jest.fn().mockResolvedValue("https://signed.example/x" as never);

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send = sendMock; },
  PutObjectCommand: class { constructor(public input: unknown) {} },
  GetObjectCommand: class { constructor(public input: unknown) {} },
  DeleteObjectCommand: class { constructor(public input: unknown) {} },
}));
jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

process.env.STORAGE_DRIVER = "s3";
process.env.STORAGE_BUCKET = "test-bucket";
process.env.S3_REGION = "us-west-2";
process.env.S3_PRESIGN_TTL = "60";

let S3Storage: typeof import("../../storage/S3Storage.js").S3Storage;
beforeAll(async () => {
  ({ S3Storage } = await import("../../storage/S3Storage.js"));
});

beforeEach(() => {
  sendMock.mockClear();
  getSignedUrlMock.mockClear();
});
afterEach(() => {
  delete process.env.STORAGE_PUBLIC_BASE_URL;
});

describe("S3Storage", () => {
  it("presignUpload uses the configured bucket and TTL and returns the signed URL", async () => {
    const s = new S3Storage();
    const r = await s.presignUpload({
      fileName: "cv.pdf",
      contentType: "application/pdf",
      scope: "resume",
      ownerId: "u-1",
    });
    expect(r.uploadUrl).toBe("https://signed.example/x");
    expect(r.expiresIn).toBe(60);
    expect(r.key.startsWith("resume/u-1/")).toBe(true);
    const cmd = (getSignedUrlMock.mock.calls[0] as unknown[])[1] as { input: { Bucket: string; ContentType: string } };
    expect(cmd.input.Bucket).toBe("test-bucket");
    expect(cmd.input.ContentType).toBe("application/pdf");
  });

  it("presignDownload signs a GetObjectCommand and respects custom TTL", async () => {
    const s = new S3Storage();
    const url = await s.presignDownload("avatar/u/x.png", 120);
    expect(url).toBe("https://signed.example/x");
    const opts = (getSignedUrlMock.mock.calls[0] as unknown[])[2] as { expiresIn: number };
    expect(opts.expiresIn).toBe(120);
  });

  it("publicUrl falls back to the AWS hostname when no overrides are set", () => {
    const s = new S3Storage();
    expect(s.publicUrl("k")).toBe("https://test-bucket.s3.us-west-2.amazonaws.com/k");
  });

  it("publicUrl prefers STORAGE_PUBLIC_BASE_URL when configured", async () => {
    process.env.STORAGE_PUBLIC_BASE_URL = "https://cdn.example/";
    const s = new S3Storage();
    expect(s.publicUrl("k")).toBe("https://cdn.example/k");
  });

  it("delete() sends a DeleteObjectCommand for the bucket+key", async () => {
    const s = new S3Storage();
    await s.delete("avatar/u/x.png");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = (sendMock.mock.calls[0] as unknown[])[0] as { input: { Bucket: string; Key: string } };
    expect(cmd.input).toEqual({ Bucket: "test-bucket", Key: "avatar/u/x.png" });
  });
});
