import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { LEADERSHIP } from "@/lib/public-content";

/**
 * The society's office bearers, side by side under the founder: Secretary on
 * the left, Joint Secretary on the right. `LEADERSHIP` is ordered, so the
 * columns follow the array rather than being positioned individually.
 */
export default function LeadershipRow() {
  return (
    <section className="py-16 px-6 bg-background border-b border-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {LEADERSHIP.map((person, i) => (
            <motion.figure
              key={person.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center rounded-2xl border border-border bg-card p-6 sm:p-8 h-full"
            >
              <img
                src={person.photo}
                alt={person.name}
                loading="lazy"
                className="w-36 sm:w-44 aspect-[3/4] rounded-xl object-cover object-top shadow-md ring-1 ring-border bg-muted"
              />
              <figcaption className="mt-5">
                <p className="text-base font-semibold text-foreground">{person.name}</p>
                <p className="text-sm text-primary mt-0.5">{person.role},</p>
                <p className="text-xs text-muted-foreground mt-0.5">{person.org}</p>
              </figcaption>

              <blockquote className="mt-5 flex flex-col items-center">
                <Quote className="h-6 w-6 text-primary/25 mb-3" aria-hidden />
                <p className="text-sm sm:text-[15px] text-foreground italic leading-relaxed">
                  "{person.quote}"
                </p>
              </blockquote>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
