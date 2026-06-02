/**
 * Resume retention cleanup. Sweeps `JobApplication` rows whose resume keys
 * are older than `RESUME_RETENTION_DAYS` (env, default 180) and:
 *   1) deletes the underlying storage object (best-effort)
 *   2) nulls `resumeKey` and stamps `resumeDeletedAt`
 *
 * Idempotent — rows where `resumeKey` is already null are skipped by the query.
 * Storage delete failures are logged but do not abort the sweep.
 */
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { getStorage } from "../storage/index.js";

export interface ResumeCleanupResult {
  scanned: number;
  deleted: number;
  failed: number;
}

export const runResumeCleanup = async (retentionDays: number): Promise<ResumeCleanupResult> => {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.jobApplication.findMany({
    where: { resumeKey: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true, resumeKey: true },
  });
  let deleted = 0;
  let failed = 0;
  const storage = getStorage();
  for (const r of rows) {
    try {
      if (r.resumeKey) await storage.delete(r.resumeKey);
    } catch (e) {
      failed += 1;
      logger.warn({ err: e, key: r.resumeKey }, "resume storage delete failed; will retry next sweep");
      continue;
    }
    await prisma.jobApplication.update({
      where: { id: r.id },
      data: { resumeKey: null, resumeDeletedAt: new Date() },
    });
    deleted += 1;
  }
  logger.info({ scanned: rows.length, deleted, failed }, "resume cleanup complete");
  return { scanned: rows.length, deleted, failed };
};

/** Wire a daily interval. Returns a stop handle for graceful shutdown / tests. */
export const startResumeCleanupCron = (retentionDays: number, intervalMs = 24 * 60 * 60 * 1000) => {
  const handle = setInterval(() => {
    runResumeCleanup(retentionDays).catch((err) =>
      logger.error({ err }, "resume cleanup sweep crashed"),
    );
  }, intervalMs);
  handle.unref?.();
  return () => clearInterval(handle);
};