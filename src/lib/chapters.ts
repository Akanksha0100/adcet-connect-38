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
  blurb: string;
  /** Tailwind gradient classes evoking the city, used for the card header. */
  accent: string;
  joinHref: string | null;
}

export const CHAPTERS: Chapter[] = [
  {
    slug: "pune",
    name: "Pune Chapter",
    blurb:
      "Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.",
    accent: "from-orange-500 to-amber-400",
    joinHref: null,
  },
  {
    slug: "mumbai",
    name: "Mumbai Chapter",
    blurb:
      "Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country's commercial capital.",
    accent: "from-cyan-500 to-sky-400",
    joinHref: null,
  },
  {
    slug: "bangalore",
    name: "Bangalore Chapter",
    blurb:
      "Engineers, founders and researchers in India's technology hub, driving mentorship, internships and startup collaboration for ADCET students.",
    accent: "from-emerald-500 to-lime-400",
    joinHref: null,
  },
];
