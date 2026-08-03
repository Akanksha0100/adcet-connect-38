/**
 * Admin-tunable application settings.
 *
 * The registry below — not the database — is the source of truth for which
 * settings exist and what they default to. An `AppSetting` row appears only
 * once an admin overrides a default, so a missing row is the normal case and
 * adding a new setting needs no migration or backfill.
 *
 * Every value round-trips through its Zod schema, so a hand-edited or
 * stale row can never hand a service something of the wrong shape: a value
 * that fails to parse is logged and the default is used instead.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

export const SETTINGS = {
  /**
   * How many feed posts one member may publish per calendar month.
   * Admins are exempt (see `feed.service.ts`).
   */
  feedPostsPerMonth: {
    schema: z.coerce.number().int().min(1).max(1000),
    default: 10,
    label: "Feed posts per member each month",
    description:
      "Members may publish this many posts per calendar month. The allowance resets on the 1st. Admins are not limited.",
  },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export const isSettingKey = (key: string): key is SettingKey =>
  Object.prototype.hasOwnProperty.call(SETTINGS, key);

/** Read one setting, falling back to its default when unset or unparseable. */
export const getSetting = async <K extends SettingKey>(key: K): Promise<SettingValue<K>> => {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return SETTINGS[key].default as SettingValue<K>;
  return parseOrDefault(key, row.value);
};

/** Read every setting as a plain object — what the admin settings screen loads. */
export const getAllSettings = async (): Promise<Record<SettingKey, unknown>> => {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [
      key,
      stored.has(key) ? parseOrDefault(key, stored.get(key)!) : SETTINGS[key].default,
    ]),
  ) as Record<SettingKey, unknown>;
};

/**
 * Write settings. Values are validated against the registry first, so an
 * invalid one is rejected before anything is persisted rather than leaving a
 * half-applied update behind.
 */
export const setSettings = async (
  updates: Partial<Record<SettingKey, unknown>>,
  updatedById?: string,
): Promise<Record<SettingKey, unknown>> => {
  const parsed = Object.entries(updates)
    .filter(([key]) => isSettingKey(key))
    .map(([key, value]) => ({
      key: key as SettingKey,
      value: SETTINGS[key as SettingKey].schema.parse(value),
    }));

  await prisma.$transaction(
    parsed.map(({ key, value }) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value), updatedById },
        update: { value: JSON.stringify(value), updatedById },
      }),
    ),
  );
  return getAllSettings();
};

const parseOrDefault = <K extends SettingKey>(key: K, raw: string): SettingValue<K> => {
  try {
    return SETTINGS[key].schema.parse(JSON.parse(raw)) as SettingValue<K>;
  } catch (err) {
    logger.error({ err, key, raw }, "[settings] stored value is invalid — using the default");
    return SETTINGS[key].default as SettingValue<K>;
  }
};
