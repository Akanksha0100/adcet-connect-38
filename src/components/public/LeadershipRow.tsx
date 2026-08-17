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
 *
 * Within that column the reading order matches the founder's block above:
 * message first, then the name and office beneath it in the founder's own type
 * sizes, so the three messages on the landing page read as one treatment. The
 * caption sits on `mt-auto`, which pins both names to the foot of the row
 * however long the two messages are.
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
                <blockquote>
                  <Quote className="h-8 w-8 text-primary/30 mb-4" aria-hidden />
                  <p className="text-lg sm:text-xl text-foreground italic leading-relaxed">
                    "{person.quote}"
                  </p>
                </blockquote>

                <figcaption className="mt-auto pt-4">
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{person.role},</p>
                  <p className="text-xs text-muted-foreground leading-snug">{person.org}</p>
                </figcaption>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
