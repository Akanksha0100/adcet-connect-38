/**
 * Jest setup — runs before each test file.
 *
 * Sets the env vars that `src/config/env.ts` validates at import-time. Without
 * these the env schema would call `process.exit(1)` and abort the suite.
 *
 * NODE_ENV is forced to `test` so the mailer is no-op'd and the Prisma client
 * uses verbose-but-safe logging defaults.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-access-secret-min-16-chars";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-min-16-chars";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.STORAGE_DRIVER = "local";
process.env.LOG_LEVEL = "silent";