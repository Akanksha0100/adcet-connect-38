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

export const UPLOAD_SCOPES = [
  "avatar", "banner", "event", "achievement", "receipt", "resume",
  "event-attachment", "job-attachment", "email-attachment", "post",
] as const;
export type UploadScope = (typeof UPLOAD_SCOPES)[number];

/** Feed post media limits. Mirrored by the composer UI in the frontend. */
export const FEED_MEDIA = {
  MAX_IMAGES: 2,
  MAX_VIDEOS: 1,
  MAX_BYTES: 10 * 1024 * 1024,
  IMAGE_MIME_PREFIX: "image/",
  VIDEO_MIME_PREFIX: "video/",
} as const;

export const DEPARTMENTS = [
  "CSE",
  "CSE (IoT & Cyber Security)",
  "CSE (AI & Data Science)",
  "Robotics & Automation",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Aeronautical Engineering",
  "Food Technology",
  "E&TC",
] as const;
export type DepartmentName = (typeof DEPARTMENTS)[number];

/**
 * The regional chapters the platform ships with. Seeded on `npm run seed` and
 * on server boot so a fresh database always has them. Admins can create more
 * at runtime; none of them can ever be deleted (only archived).
 */
export const DEFAULT_CHAPTERS = [
  {
    slug: "pune",
    name: "Pune Chapter",
    city: "Pune",
    accent: "from-orange-500 to-amber-400",
    blurb:
      "Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.",
  },
  {
    slug: "mumbai",
    name: "Mumbai Chapter",
    city: "Mumbai",
    accent: "from-cyan-500 to-sky-400",
    blurb:
      "Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country's commercial capital.",
  },
  {
    slug: "bangalore",
    name: "Bangalore Chapter",
    city: "Bangalore",
    accent: "from-emerald-500 to-lime-400",
    blurb:
      "Engineers, founders and researchers in India's technology hub, driving mentorship, internships and startup collaboration for ADCET students.",
  },
] as const;

export const THEMES = ["default", "ocean", "sunset", "forest", "royal"] as const;
export type ThemeName = (typeof THEMES)[number];