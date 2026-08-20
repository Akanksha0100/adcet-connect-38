import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";
import { fetchTopDonors, formatAmount, initialsOf, type TopDonor } from "@/lib/donors";
import { storageUrl } from "@/lib/storage";

/**
 * The donor honour roll: the largest givers, sliding right to left.
 *
 * **Deliberately a different motion from `EsteemedStrip` above it.** That one
 * is a continuous ticker; this advances one card at a time — a slide, a pause
 * long enough to actually read a name and a figure, then the next — which is
 * the calmer register a page about money wants. Both travel right to left, so
 * the two sections still feel like one page.
 *
 * The list is rendered twice and the track snaps back to the start (with the
 * transition off for one frame) the moment the first copy has passed, so the
 * loop is seamless in either direction of travel. Hovering pauses it, and a
 * visitor who asked for reduced motion gets the row standing still.
 *
 * Nothing here is hand-maintained: the API sums each alumnus' received gifts,
 * so a new largest donor appears on their own, and anyone who gave anonymously
 * never does.
 */

/** Card width + gap, in px. The track translates by exact multiples of this. */
const STEP = 236;
const SLIDE_MS = 3200;

const DonorCard = ({ donor, rank }: { donor: TopDonor; rank: number }) => {
  const photo = storageUrl(donor.avatarKey);
  return (
    <figure className="w-[212px] shrink-0 mr-6 rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
      <div className="relative w-16 h-16 mx-auto">
        {photo ? (
          <img
            src={photo}
            alt={donor.name}
            loading="lazy"
            className="w-16 h-16 rounded-full object-cover object-top ring-2 ring-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary ring-2 ring-border flex items-center justify-center text-lg font-semibold">
            {initialsOf(donor.name)}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center ring-2 ring-card">
          {rank}
        </span>
      </div>

      <figcaption className="mt-4">
        <p className="text-sm font-semibold text-foreground leading-snug break-words">{donor.name}</p>
        {donor.graduationYear && (
          <p className="text-[11px] text-muted-foreground mt-0.5">Batch of {donor.graduationYear}</p>
        )}
        <p className="text-lg font-bold text-primary mt-2">{formatAmount(donor.amount)}</p>
      </figcaption>
    </figure>
  );
};

export default function TopDonorsStrip() {
  const { data } = useQuery({
    queryKey: ["donors", "top"],
    queryFn: () => fetchTopDonors(12),
  });
  const donors = data ?? [];

  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  ).current;

  const count = donors.length;
  useEffect(() => {
    if (reduced || paused || count === 0) return;
    const id = setInterval(() => setIndex((i) => i + 1), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduced, paused, count]);

  /* One frame with the transition off puts the track back at the first card
     without a visible rewind; the effect restores it immediately after. */
  useEffect(() => {
    if (animating) return;
    const id = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(id);
  }, [animating]);

  // An empty roll (no received, non-anonymous gifts yet) shows nothing at all —
  // a landing-page section with a "no data" message reads as broken.
  if (count === 0) return null;

  return (
    <section className="py-16 bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 flex items-center justify-center gap-2.5">
          <HeartHandshake className="h-6 w-6 text-primary" aria-hidden />
          Our Generous Donors
        </h2>
        <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Alumni whose contributions fund scholarships, laboratories and student initiatives at ADCET.
        </p>
      </div>

      <div
        className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex w-max px-6"
          style={{
            transform: `translateX(-${index * STEP}px)`,
            transition: animating ? "transform 900ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
          onTransitionEnd={() => {
            if (index >= count) {
              setAnimating(false);
              setIndex(0);
            }
          }}
        >
          {donors.map((d, i) => (
            <DonorCard key={d.id} donor={d} rank={i + 1} />
          ))}
          {/* Second copy: what the track slides into before it snaps back. */}
          {donors.map((d, i) => (
            <div key={`${d.id}-echo`} aria-hidden="true">
              <DonorCard donor={d} rank={i + 1} />
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8 px-6">
        Listed by total contribution. Gifts made anonymously are not shown.
      </p>
    </section>
  );
}
