import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Marquee from "@/components/public/Marquee";
import { BOARD_MEMBERS, initialsOf } from "@/lib/board";

/** Auto-scrolling row of association board members; each card opens the About page. */
export default function BoardStrip() {
  return (
    <section className="py-16 bg-muted/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Alumni Association Board</h2>
        <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          The office bearers, deans and departmental coordinators who steer the ADCET Alumni Association.
        </p>
      </div>

      <Marquee durationSec={70}>
        {BOARD_MEMBERS.map((m) => (
          <Link
            key={m.name}
            to="/about#board"
            title={`${m.name} — ${m.designation}`}
            className="w-[160px] sm:w-[180px] mx-2.5 shrink-0 group/card"
          >
            <div className="rounded-xl overflow-hidden bg-card ring-1 ring-border shadow-sm transition-shadow group-hover/card:shadow-md">
              {m.photo ? (
                <img
                  src={m.photo}
                  alt={m.name}
                  loading="lazy"
                  className="w-full aspect-[6/7] object-cover object-top"
                />
              ) : (
                <div className="w-full aspect-[6/7] flex items-center justify-center bg-primary/10 text-primary text-2xl font-semibold">
                  {initialsOf(m.name)}
                </div>
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground leading-snug group-hover/card:text-primary transition-colors">
              {m.name}
            </p>
            <p className="text-[11px] text-primary/80 leading-snug mt-0.5">({m.authority})</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
              {m.designation}
            </p>
          </Link>
        ))}
      </Marquee>

      <div className="text-center mt-10">
        <Link
          to="/about#board"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View the full board <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
