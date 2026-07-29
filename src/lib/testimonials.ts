/**
 * Alumni testimonials shown on the landing page.
 *
 * PLACEHOLDER CONTENT — the entries below carry deliberately generic names so
 * they are obvious until the Alumni Cell supplies real quotes. Replace `name`,
 * `role`, `batch` and `quote`, and drop a portrait into `public/Testimonials/`
 * and reference it as `photo` (optional — initials are used when absent).
 */
export interface Testimonial {
  name: string;
  role: string;
  batch?: string;
  quote: string;
  photo?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Alumnus Name",
    role: "Designation, Organisation",
    batch: "Batch of 20XX",
    quote:
      "The years at ADCET gave me more than a degree — the labs, the project reviews and the faculty who stayed back after hours built the way I approach problems today.",
  },
  {
    name: "Alumnus Name",
    role: "Designation, Organisation",
    batch: "Batch of 20XX",
    quote:
      "Coming from a small town, ADCET was where I learnt to speak up, lead a team and take an idea from a sketch to a working prototype. That confidence has carried through my entire career.",
  },
  {
    name: "Alumnus Name",
    role: "Designation, Organisation",
    batch: "Batch of 20XX",
    quote:
      "What stays with me is the culture — seniors helping juniors, faculty treating us as colleagues, and a campus that expected us to be useful to society, not just employable.",
  },
];

export const initialsOfName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
