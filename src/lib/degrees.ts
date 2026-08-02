/**
 * Single source of truth for the degrees ADCET awards.
 * Must stay in sync with `backend/src/config/constants.ts` (DEGREES).
 *
 * `durationYears` is why sign-up asks only for the graduation year: the
 * admission year is derived from the two, so they can never contradict.
 */
export const DEGREES = [
  { value: "BE", label: "B.E. / B.Tech", durationYears: 4 },
  { value: "ME", label: "M.E. / M.Tech", durationYears: 2 },
] as const;

export type DegreeValue = (typeof DEGREES)[number]["value"];

export const degreeLabel = (value?: string | null): string =>
  DEGREES.find((d) => d.value === value)?.label ?? "";

/** Admission year implied by a graduation year — shown to the user as a hint. */
export const admissionYearFor = (degree: DegreeValue, graduationYear: number): number =>
  graduationYear - DEGREES.find((d) => d.value === degree)!.durationYears;

export const MIN_ACADEMIC_YEAR = 1980;

/** Months for the birthday picker — the birth *year* is never collected. */
export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

/**
 * Days available in a given month, ignoring the year. February gets 29 because
 * the 29th is a real birthday — we simply never know if it's a leap year.
 */
export const daysInMonth = (month: number): number =>
  [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
