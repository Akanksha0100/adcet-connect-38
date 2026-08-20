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
  "newsletter", "newsletter-cover", "gallery", "collaboration",
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

/**
 * Alumni Collaboration attachment ceiling — one file per request, 10 MB.
 *
 * Bytes go browser -> storage, so nothing on the server sees the file: the
 * request forms enforce this before presigning. Mirrored by
 * `COLLABORATION_ATTACHMENT_MAX_BYTES` in `src/lib/collaboration.ts`.
 */
export const COLLABORATION_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The official ADCET department names — the single source of truth for every
 * department-typed value the API accepts or stores. Mirrored verbatim by
 * `src/lib/departments.ts` on the frontend; the two lists must stay identical.
 *
 * These are the names as the college writes them. Earlier releases stored
 * abbreviations ("CSE", "E&TC", …); migration `rename_departments` rewrote the
 * stored values, so nothing outside that migration should reference the old
 * spellings.
 */
export const DEPARTMENTS = [
  "Mechanical Engineering",
  "Computer Science and Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Aeronautical Engineering",
  "Food Technology",
  "Artificial Intelligence and Data Science",
  "Internet of Things and Cyber Security(CSE)",
  "Robotics and Artificial Intelligence",
  "Electronics and Telecommunication Engineering",
  "Automobile Engineering",
  "Mechanical and Automation Engineering",
] as const;
export type DepartmentName = (typeof DEPARTMENTS)[number];

/** Set form for O(1) membership checks in validators and services. */
export const DEPARTMENT_SET: ReadonlySet<string> = new Set(DEPARTMENTS);

/**
 * The degrees ADCET awards. `durationYears` is what lets sign-up ask only for
 * the graduation year and derive the admission year from it, so the two can
 * never contradict each other. Mirrored by `src/lib/degrees.ts`.
 */
export const DEGREES = [
  { value: "BE", label: "B.E. / B.Tech", durationYears: 4 },
  { value: "ME", label: "M.E. / M.Tech", durationYears: 2 },
] as const;

export type DegreeValue = (typeof DEGREES)[number]["value"];

export const DEGREE_VALUES = DEGREES.map((d) => d.value) as unknown as [
  DegreeValue,
  ...DegreeValue[],
];

/** Course length in years, keyed by degree. */
export const DEGREE_DURATION_YEARS: Record<DegreeValue, number> = Object.fromEntries(
  DEGREES.map((d) => [d.value, d.durationYears]),
) as Record<DegreeValue, number>;

/**
 * Admission year implied by a graduation year for a given degree. Sign-up no
 * longer collects it separately — see `DEGREES`.
 */
export const admissionYearFor = (degree: DegreeValue, graduationYear: number): number =>
  graduationYear - DEGREE_DURATION_YEARS[degree];

/** Earliest year the forms and validators will accept. */
export const MIN_ACADEMIC_YEAR = 1980;

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
    sortOrder: 1,
    blurb:
      "Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.",
  },
  {
    slug: "mumbai",
    name: "Mumbai Chapter",
    city: "Mumbai",
    accent: "from-cyan-500 to-sky-400",
    sortOrder: 2,
    blurb:
      "Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country's commercial capital.",
  },
  {
    slug: "bangalore",
    name: "Bangalore Chapter",
    city: "Bangalore",
    accent: "from-emerald-500 to-lime-400",
    sortOrder: 3,
    blurb:
      "Engineers, founders and researchers in India's technology hub, driving mentorship, internships and startup collaboration for ADCET students.",
  },
  {
    // Not a city — the catch-all for alumni outside the three regional hubs,
    // which is why `city` is null and the card shows no location line.
    slug: "global",
    name: "Global Chapter",
    city: null,
    accent: "from-indigo-500 to-violet-400",
    sortOrder: 4,
    blurb:
      "ADCET alumni working and studying outside India — from the Gulf and Europe to North America, Australia and East Asia — keeping the network reachable across time zones.",
  },
] as const;

export const THEMES = ["default", "ocean", "sunset", "forest", "royal"] as const;
export type ThemeName = (typeof THEMES)[number];