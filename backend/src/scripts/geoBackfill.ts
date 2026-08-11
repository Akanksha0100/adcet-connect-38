/**
 * One-off geo backfill: `npm run geo:backfill`.
 *
 * Run after importing alumni in bulk, or after adding cities to the gazetteer,
 * to place everyone whose city hasn't been resolved yet. Safe to re-run — see
 * `jobs/geoBackfill.ts` for why.
 */
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { runGeoBackfill } from "../jobs/geoBackfill.js";

const limit = Number(process.argv[2] ?? 500);

runGeoBackfill({ limit })
  .then((r) => {
    logger.info(r, "backfill finished");
    if (r.unresolved > 0) {
      logger.warn(
        { unresolved: r.unresolved },
        "some cities could not be placed — add them to config/gazetteer.ts or correct the profiles",
      );
    }
  })
  .catch((err) => {
    logger.error({ err }, "backfill failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
