/**
 * Regional alumni chapters.
 *
 * The platform has no chapters module yet — once it exists, give each chapter
 * a `joinHref` (e.g. `/chapters/pune`) and the "Join Now" buttons will route
 * there instead of showing the placeholder notice.
 */
export interface Chapter {
  slug: string;
  name: string;
  city: string;
  blurb: string;
  joinHref: string | null;
}

export const CHAPTERS: Chapter[] = [
  {
    slug: "pune",
    name: "Pune Chapter",
    city: "Pune, Maharashtra",
    blurb:
      "Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.",
    joinHref: null,
  },
  {
    slug: "mumbai",
    name: "Mumbai Chapter",
    city: "Mumbai, Maharashtra",
    blurb:
      "Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country's commercial capital.",
    joinHref: null,
  },
  {
    slug: "bangalore",
    name: "Bangalore Chapter",
    city: "Bengaluru, Karnataka",
    blurb:
      "Engineers, founders and researchers in India's technology hub, driving mentorship, internships and startup collaboration for ADCET students.",
    joinHref: null,
  },
];
