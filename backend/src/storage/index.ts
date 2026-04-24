/**
 * Storage factory. Single entry point — modules call `getStorage()` and never
 * import a concrete adapter. Swap providers by changing `STORAGE_DRIVER`.
 */
import { env } from "../config/env.js";
import type { StorageService } from "./StorageService.js";
import { S3Storage } from "./S3Storage.js";
import { LocalStorage } from "./LocalStorage.js";

let instance: StorageService | null = null;

export const getStorage = (): StorageService => {
  if (instance) return instance;
  switch (env.STORAGE_DRIVER) {
    case "s3":
    case "minio":
      instance = new S3Storage();
      break;
    case "local":
      instance = new LocalStorage();
      break;
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.STORAGE_DRIVER as string}`);
  }
  return instance;
};

export type { StorageService } from "./StorageService.js";