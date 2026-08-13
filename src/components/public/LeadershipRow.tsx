import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { LEADERSHIP } from "@/lib/public-content";

/**
 * The society's office bearers, side by side under the founder: Secretary on
 * the left, Joint Secretary on the right. `LEADERSHIP` is ordered, so the
 * columns follow the array rather than being positioned individually.
 *
 * Each card lays out horizontally — portrait left, text right. Stacking them
 * centre-aligned instead leaves a wide empty margin either side of the portrait,
 * because a half-width card is far wider than the picture inside it.
 */
export default function LeadershipRow() {
  return (
    <section className="py-16 px-6 bg-background border-b border-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEADERSHIP.map((person, i) => (
            <motion.figure
              key={person.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-5 sm:gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 h-full shadow-sm"
            >
              <img
                src={person.photo}
                alt={person.name}
                loading="lazy"
                className="w-28 sm:w-36 shrink-0 aspect-[3/4] rounded-xl object-cover object-top ring-1 ring-border bg-muted"
              />

              <div className="flex-1 min-w-0 flex flex-col">
                <figcaption>
                  <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                    {person.name}
                  </p>
                  <p className="text-sm sm:text-base text-primary mt-1">{person.role},</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
                    {person.org}
                  </p>
                </figcaption>

                <blockquote className="mt-4 pt-4 border-t border-border">
                  <Quote className="h-5 w-5 text-primary/25 mb-2" aria-hidden />
                  <p className="text-sm sm:text-[15px] text-foreground/90 italic leading-relaxed">
                    "{person.quote}"
                  </p>
                </blockquote>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
