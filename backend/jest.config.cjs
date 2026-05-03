/**
 * Jest config for the ESM + TypeScript backend.
 *
 * The source uses ESM with explicit `.js` extensions on relative imports
 * (required for native Node ESM). We map `(\.{1,2}/.*)\.js$` → strip the
 * extension so ts-jest can resolve the corresponding `.ts` source. Tests
 * themselves can import either way.
 *
 * Run with `npm test`. To avoid ESM init costs during watch loops, single
 * files can be targeted with `npm test -- path/to/file.test.ts`.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        diagnostics: false,
        tsconfig: {
          module: "ESNext",
          target: "ES2022",
          moduleResolution: "Bundler",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          allowSyntheticDefaultImports: true,
          types: ["jest", "node"],
        },
      },
    ],
  },
  clearMocks: true,
  resetMocks: false,
  collectCoverageFrom: [
    "**/*.ts",
    "!**/tests/**",
    "!**/types/**",
    "!server.ts",
    "!config/openapi.ts",
  ],
  coverageDirectory: "../coverage",
};