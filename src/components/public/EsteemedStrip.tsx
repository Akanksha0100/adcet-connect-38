import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Marquee from "@/components/public/Marquee";
import { ESTEEMED_ALUMNI, subtitleOf } from "@/lib/esteemed";

/** Sliding row of esteemed alumni; every card opens the full listing. */
export default function EsteemedStrip() {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Esteemed Alumni</h2>
        <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Graduates whose work in industry, enterprise and public service carries the ADCET name forward.
        </p>
      </div>

      <Marquee durationSec={45}>
        {ESTEEMED_ALUMNI.map((a) => (
          <Link
            key={a.name}
            to="/esteemed-alumni"
            className="w-[150px] mx-3 shrink-0 text-center group/card"
            title={`${a.name}${subtitleOf(a) ? ` — ${subtitleOf(a)}` : ""}`}
          >
            <img
              src={a.photo}
              alt={a.name}
              loading="lazy"
              className="w-28 h-28 mx-auto rounded-full object-cover object-top ring-2 ring-border shadow-sm
                transition-all group-hover/card:ring-primary/50 group-hover/card:shadow-md"
            />
            <p className="mt-3.5 text-sm font-medium text-foreground leading-snug group-hover/card:text-primary transition-colors">
              {a.name}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{subtitleOf(a)}</p>
          </Link>
        ))}
      </Marquee>

      <div className="text-center mt-10">
        <Link
          to="/esteemed-alumni"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Meet all our esteemed alumni <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
