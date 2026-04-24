/**
 * Application-wide constants. Centralized so they can be tuned in one place
 * and referenced across modules without magic strings.
 */

export const ROLES = {
  ALUMNI: "ALUMNI",
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  RECRUITER: "RECRUITER",
} as const;

export type AppRoleName = (typeof ROLES)[keyof typeof ROLES];

export const APPROVAL = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const RATE_LIMITS = {
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX: 20,
  GLOBAL_WINDOW_MS: 60 * 1000,
  GLOBAL_MAX: 300,
} as const;

export const UPLOAD_SCOPES = ["avatar", "event", "achievement", "receipt", "resume"] as const;
export type UploadScope = (typeof UPLOAD_SCOPES)[number];