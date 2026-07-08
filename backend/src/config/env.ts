/**
 * Typed environment configuration.
 * All env access in the app should go through `env`.
 */
import "dotenv/config";
import { z } from "zod";

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

  STORAGE_DRIVER: z.enum(["minio", "s3", "local"]).default("minio"),
  STORAGE_BUCKET: z.string().default("adcet-alumni"),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PRESIGN_TTL: z.coerce.number().default(900),

  LOCAL_STORAGE_DIR: z.string().default("./uploads"),

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
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;