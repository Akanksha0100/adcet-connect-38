/**
 * Typed environment configuration.
 * All env access in the app should go through `env`.
 */
import "dotenv/config";
import { z } from "zod";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Parse Cloudinary's own `cloudinary://<api_key>:<api_secret>@<cloud_name>` env format. */
const parseCloudinaryUrl = (url?: string): Partial<CloudinaryConfig> => {
  if (!url) return {};
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
  if (!m) return {};
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3].replace(/\/.*$/, "") };
};

/** Explicit vars win over CLOUDINARY_URL so a single value can be overridden. */
const resolveCloudinary = (source: {
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}): CloudinaryConfig | null => {
  const fromUrl = parseCloudinaryUrl(source.CLOUDINARY_URL);
  const cloudName = source.CLOUDINARY_CLOUD_NAME || fromUrl.cloudName;
  const apiKey = source.CLOUDINARY_API_KEY || fromUrl.apiKey;
  const apiSecret = source.CLOUDINARY_API_SECRET || fromUrl.apiSecret;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  CORS_ORIGIN: z.string().default("*"),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  STORAGE_DRIVER: z.enum(["minio", "s3", "local", "cloudinary"]).default("minio"),
  STORAGE_BUCKET: z.string().default("adcet-alumni"),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PRESIGN_TTL: z.coerce.number().default(900),

  LOCAL_STORAGE_DIR: z.string().default("./uploads"),

  // === Cloudinary (STORAGE_DRIVER=cloudinary) ===
  // Either set CLOUDINARY_URL (the `cloudinary://key:secret@cloud` form copied
  // straight from the dashboard) or the three explicit vars below.
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  /** Optional prefix applied to every object, e.g. `adcet/prod`. */
  CLOUDINARY_FOLDER: z.string().optional(),
  /** Upload scopes stored as Cloudinary `private` assets, reachable only via signed, expiring URLs. */
  CLOUDINARY_PRIVATE_SCOPES: z.string().default("resume,receipt"),
  CLOUDINARY_PRESIGN_TTL: z.coerce.number().default(900),

  LOG_LEVEL: z.string().default("info"),

  // === OAuth / SSO (optional — endpoints return 501 if a provider is unconfigured) ===
  OAUTH_REDIRECT_BASE_URL: z.string().optional(), // e.g. http://localhost:4000/api/v1/auth/oauth
  OAUTH_SUCCESS_REDIRECT: z.string().optional(),  // frontend URL to bounce to after success

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // === Payments (Razorpay) — optional; donation endpoints return 501 if unset ===
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Public org details printed on receipts.
  ORG_NAME: z.string().default("Annasaheb Dange College of Engineering & Technology, Ashta"),
  ORG_ADDRESS: z.string().default("Ashta, Dist. Sangli, Maharashtra 416301"),

  // === Geocoding (alumni map) ===
  // Only reached by the backfill job, and only for cities the offline gazetteer
  // in `config/gazetteer.ts` doesn't already know. Set GEOCODER=none to keep the
  // deployment entirely offline — the map then shows gazetteer cities only.
  GEOCODER: z.enum(["none", "nominatim"]).default("nominatim"),
  GEOCODER_BASE_URL: z.string().default("https://nominatim.openstreetmap.org"),
  /** Nominatim's usage policy requires a contactable identifier here. */
  GEOCODER_USER_AGENT: z.string().default("ADCET-Alumni-Portal (alumni@adcet.in)"),
  /** Nominatim allows one request per second; the extra 100 ms is slack for clock jitter. */
  GEOCODER_MIN_INTERVAL_MS: z.coerce.number().default(1100),
  GEOCODER_TIMEOUT_MS: z.coerce.number().default(8000),
}).superRefine((v, ctx) => {
  // Fail fast at boot rather than on the first upload attempt.
  if (v.STORAGE_DRIVER === "cloudinary" && !resolveCloudinary(v)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CLOUDINARY_URL"],
      message:
        "STORAGE_DRIVER=cloudinary requires CLOUDINARY_URL, or all of " +
        "CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET",
    });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Resolved Cloudinary credentials, or `null` when Cloudinary isn't configured. */
export const cloudinaryConfig = resolveCloudinary(env);