/**
 * Storage factory tests — ensures the right adapter is selected based on
 * STORAGE_DRIVER and that the chosen instance is memoized.
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.unstable_mockModule("./__noop_factory__", () => ({}));

afterEach(() => {
  jest.resetModules();
  delete process.env.STORAGE_DRIVER;
});

describe("storage factory", () => {
  it("returns LocalStorage for STORAGE_DRIVER=local and memoizes the instance", async () => {
    process.env.STORAGE_DRIVER = "local";
    const { getStorage } = await import("../../storage/index.js");
    const a = getStorage();
    const b = getStorage();
    expect(a).toBe(b);
    expect(a.constructor.name).toBe("LocalStorage");
  });
});
