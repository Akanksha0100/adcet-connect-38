import { getStorage } from "../../storage/index.js";
import type { UploadScope } from "../../config/constants.js";

export const presignUpload = (
  ownerId: string,
  input: { fileName: string; contentType: string; scope: UploadScope },
) => getStorage().presignUpload({ ...input, ownerId });

export const uploadDirect = (
  ownerId: string,
  input: { fileName: string; contentType: string; scope: UploadScope; body: Buffer },
) => getStorage().upload({ ...input, ownerId });

export const presignDownload = (key: string) => getStorage().presignDownload(key);

export const remove = (key: string) => getStorage().delete(key);
