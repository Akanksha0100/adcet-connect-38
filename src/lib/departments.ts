/**
 * Single source of truth for ADCET department names on the frontend.
 * Must stay in sync with `backend/src/config/constants.ts` (DEPARTMENTS),
 * which the API uses to validate department-targeted events/jobs.
 */
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

/** Convenience list for filter dropdowns that need an "All" option. */
export const DEPARTMENT_FILTER_OPTIONS = ["All", ...DEPARTMENTS] as const;
