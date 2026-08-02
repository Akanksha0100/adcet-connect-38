/**
 * Single source of truth for ADCET department names on the frontend.
 * Must stay in sync with `backend/src/config/constants.ts` (DEPARTMENTS),
 * which the API uses to validate department-targeted events/jobs.
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
] as const;

export type DepartmentName = (typeof DEPARTMENTS)[number];

/** Convenience list for filter dropdowns that need an "All" option. */
export const DEPARTMENT_FILTER_OPTIONS = ["All", ...DEPARTMENTS] as const;
