/**
 * Presigned uploads. One place that knows how to talk to whichever storage
 * driver the backend runs (`STORAGE_DRIVER`): S3/MinIO/local hand back a URL to
 * `PUT` the raw file to, Cloudinary hands back a `POST` endpoint plus the signed
 * multipart fields. Callers just say "upload this file to this scope".
 *
 * Bytes always go straight from the browser to storage — never through the API.
 */
import { api } from "@/lib/api";

export type UploadScope =
  | "avatar"
  | "banner"
  | "event"
  | "achievement"
  | "receipt"
  | "resume"
  | "event-attachment"
  | "job-attachment"
  | "email-attachment"
  | "post";

export type PresignResult = {
  uploadUrl: string;
  key: string;
  publicUrl?: string;
  expiresIn?: number;
  /** Absent means `PUT` — see `PresignUploadResult` in the backend storage service. */
  method?: "PUT" | "POST";
  fields?: Record<string, string>;
};

const contentTypeOf = (file: File) => file.type || "application/octet-stream";

/** Ask the API for a presigned destination for `file` under `scope`. */
export const presignUpload = (file: File, scope: UploadScope) =>
  api.post<PresignResult>("/uploads/presign", {
    fileName: file.name,
    contentType: contentTypeOf(file),
    scope,
  });

/** Send the bytes to a destination returned by `presignUpload`. */
export const uploadToPresigned = async (presigned: PresignResult, file: File): Promise<void> => {
  let res: Response;
  if (presigned.method === "POST") {
    const form = new FormData();
    for (const [name, value] of Object.entries(presigned.fields ?? {})) form.append(name, value);
    form.append("file", file);
    // No Content-Type header — the browser must set the multipart boundary.
    res = await fetch(presigned.uploadUrl, { method: "POST", body: form });
  } else {
    res = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentTypeOf(file) },
      body: file,
    });
  }
  if (!res.ok) throw new Error(`Upload failed (${res.status})${await providerError(res)}`);
};

/** Presign + upload in one step, returning the object key to persist. */
export const uploadFile = async (file: File, scope: UploadScope): Promise<string> => {
  const presigned = await presignUpload(file, scope);
  await uploadToPresigned(presigned, file);
  return presigned.key;
};

/** Storage providers explain rejections in the body; surface it or stay quiet. */
const providerError = async (res: Response): Promise<string> => {
  try {
    const body = await res.text();
    const message = body.trim().startsWith("{") ? JSON.parse(body)?.error?.message : null;
    return message ? `: ${message}` : "";
  } catch {
    return "";
  }
};
