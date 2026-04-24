/**
 * Loads the OpenAPI YAML spec from disk so it can be served via Swagger UI.
 * Kept in its own module to avoid pulling YAML parsing into the hot path.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";

let cached: unknown | null = null;

export const loadOpenApiSpec = () => {
  if (cached) return cached;
  const path = resolve(process.cwd(), "openapi.yaml");
  cached = YAML.parse(readFileSync(path, "utf8"));
  return cached;
};