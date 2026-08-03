import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const errorLog = jest.fn();
jest.unstable_mockModule("../../lib/logger.js", () => ({
  logger: { error: errorLog, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const { SETTINGS, getAllSettings, getSetting, isSettingKey, setSettings } = await import(
  "../../lib/settings.js"
);

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  errorLog.mockClear();
});

describe("lib/settings", () => {
  it("returns the registry default when no row exists", async () => {
    // The sparse table is the normal state, not an error — nothing is seeded.
    prismaMock.appSetting.findUnique.mockResolvedValueOnce(null);
    expect(await getSetting("feedPostsPerMonth")).toBe(SETTINGS.feedPostsPerMonth.default);
  });

  it("returns the stored override when one exists", async () => {
    prismaMock.appSetting.findUnique.mockResolvedValueOnce({
      key: "feedPostsPerMonth",
      value: "25",
    });
    expect(await getSetting("feedPostsPerMonth")).toBe(25);
  });

  it("falls back to the default (and logs) when a stored value is corrupt", async () => {
    prismaMock.appSetting.findUnique.mockResolvedValueOnce({
      key: "feedPostsPerMonth",
      value: "not json",
    });
    expect(await getSetting("feedPostsPerMonth")).toBe(SETTINGS.feedPostsPerMonth.default);
    expect(errorLog).toHaveBeenCalled();
  });

  it("falls back to the default when a stored value is the wrong shape", async () => {
    // Valid JSON, but not a number the schema accepts.
    prismaMock.appSetting.findUnique.mockResolvedValueOnce({
      key: "feedPostsPerMonth",
      value: '"lots"',
    });
    expect(await getSetting("feedPostsPerMonth")).toBe(SETTINGS.feedPostsPerMonth.default);
  });

  it("merges stored overrides over defaults when reading everything", async () => {
    prismaMock.appSetting.findMany.mockResolvedValueOnce([
      { key: "feedPostsPerMonth", value: "3" },
    ]);
    expect(await getAllSettings()).toEqual({ feedPostsPerMonth: 3 });
  });

  it("writes an override and records who changed it", async () => {
    prismaMock.appSetting.findMany.mockResolvedValueOnce([
      { key: "feedPostsPerMonth", value: "20" },
    ]);
    const result = await setSettings({ feedPostsPerMonth: 20 }, "admin-1");

    expect(result).toEqual({ feedPostsPerMonth: 20 });
    const call = prismaMock.appSetting.upsert.mock.calls[0][0] as any;
    expect(call.where).toEqual({ key: "feedPostsPerMonth" });
    expect(call.update).toMatchObject({ value: "20", updatedById: "admin-1" });
  });

  it("rejects an out-of-range value before writing anything", async () => {
    await expect(setSettings({ feedPostsPerMonth: 0 })).rejects.toThrow();
    expect(prismaMock.appSetting.upsert).not.toHaveBeenCalled();
  });

  it("ignores unknown keys rather than persisting them", async () => {
    prismaMock.appSetting.findMany.mockResolvedValueOnce([]);
    await setSettings({ notARealSetting: 5 } as never);
    expect(prismaMock.appSetting.upsert).not.toHaveBeenCalled();
  });

  it("recognises only registered keys", () => {
    expect(isSettingKey("feedPostsPerMonth")).toBe(true);
    expect(isSettingKey("nope")).toBe(false);
  });
});
