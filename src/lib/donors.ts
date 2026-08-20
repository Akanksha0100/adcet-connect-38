/**
 * The public donor honour roll.
 *
 * Nothing here is curated: `GET /donations/public/top-donors` sums each
 * alumnus' **received** gifts live, so the roll reorders itself the moment a
 * larger donation settles and a donor who gave anonymously never appears. The
 * landing page is the only reader — see `TopDonorsStrip`.
 */
import { api } from "@/lib/api";

export interface TopDonor {
  id: string;
  name: string;
  /** Lifetime total in rupees (not paise — the API stores whole rupees). */
  amount: number;
  avatarKey: string | null;
  graduationYear: number | null;
}

export const fetchTopDonors = (limit = 12) =>
  api.get<{ items: TopDonor[] }>("/donations/public/top-donors", { limit }).then((r) => r.items);

/**
 * Rupees for display: `₹2.5 L`, `₹75,000`, `₹1.2 Cr`.
 *
 * Indian grouping up to five figures, then the lakh/crore short forms the
 * office uses in its own reports — a seven-digit number on a moving card is
 * read as a shape rather than a value, and "₹12.5 L" is legible at a glance.
 */
export const formatAmount = (rupees: number): string => {
  if (rupees >= 10_000_000) return `₹${short(rupees, 10_000_000)} Cr`;
  if (rupees >= 100_000) return `₹${short(rupees, 100_000)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
};

/**
 * One decimal, no trailing ".0". Rounds on the scaled *tenths* rather than with
 * `toFixed`, which reads ₹1,45,000 as 1.4 L — binary floats put 1.45 a hair
 * below the halfway point, and a donor's figure should never round down.
 */
const short = (rupees: number, unit: number) => String(Math.round(rupees / (unit / 10)) / 10);

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "A";
