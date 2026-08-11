import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { Testimonial, excerptOf, initialsOfName } from "@/lib/testimonials";

interface Props {
  testimonial: Testimonial;
  /** Show the whole quote instead of a clickable excerpt — used by `/testimonials`. */
  full?: boolean;
}

/**
 * One testimonial: a rectangular portrait on the left with the name, batch and
 * designation stacked underneath it, and the quote to its right.
 *
 * On the landing page the quote is an excerpt that links to `/testimonials`;
 * that page renders the same card with `full` so the layout stays recognisable.
 */
export default function TestimonialCard({ testimonial: t, full = false }: Props) {
  const { text, truncated } = full
    ? { text: t.quote, truncated: false }
    : excerptOf(t.quote);

  const quoteBody = (
    <>
      <Quote className="h-5 w-5 text-primary/25 mb-3" aria-hidden />
      <p className="text-sm sm:text-base text-foreground/90 italic leading-relaxed">"{text}"</p>
      {truncated && (
        <span className="inline-block mt-3 text-xs font-medium text-primary group-hover:underline">
          Read full testimonial
        </span>
      )}
    </>
  );

  return (
    <figure className="flex gap-4 sm:gap-7 bg-card border border-border rounded-2xl p-4 sm:p-7 shadow-sm text-left h-full">
      {/* Portrait + attribution */}
      <figcaption className="w-24 sm:w-36 shrink-0">
        {t.photo ? (
          <img
            src={t.photo}
            alt={t.name}
            loading="lazy"
            className="w-full aspect-[3/4] rounded-lg object-cover object-top border border-border bg-muted"
          />
        ) : (
          <div className="w-full aspect-[3/4] rounded-lg border border-border bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
            {initialsOfName(t.name)}
          </div>
        )}
        <p className="mt-3 text-sm font-semibold text-foreground leading-snug">{t.name}</p>
        {t.batch && <p className="text-xs text-primary/80 mt-0.5">{t.batch}</p>}
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.role}</p>
      </figcaption>

      {/* Quote */}
      {full ? (
        <blockquote className="flex-1 min-w-0">{quoteBody}</blockquote>
      ) : (
        <Link
          to="/testimonials"
          aria-label={`Read ${t.name}'s full testimonial`}
          className="group flex-1 min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <blockquote>{quoteBody}</blockquote>
        </Link>
      )}
    </figure>
  );
}
