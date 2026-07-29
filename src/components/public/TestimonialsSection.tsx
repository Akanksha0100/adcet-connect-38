import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { TESTIMONIALS, initialsOfName } from "@/lib/testimonials";

const INTERVAL_MS = 8000;

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const count = TESTIMONIALS.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;

  const t = TESTIMONIALS[index % count];
  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <section className="py-16 px-6 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Testimonials</h2>
          <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">In our alumni's own words</p>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="bg-card border border-border rounded-2xl px-6 sm:px-10 py-9 text-center shadow-sm"
            >
              <Quote className="h-7 w-7 text-primary/25 mx-auto mb-5" />
              <p className="text-base sm:text-lg text-foreground italic leading-relaxed">"{t.quote}"</p>

              <div className="flex items-center justify-center gap-3 mt-7">
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {initialsOfName(t.name)}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}
                    {t.batch ? ` · ${t.batch}` : ""}
                  </p>
                </div>
              </div>
            </motion.blockquote>
          </AnimatePresence>

          {count > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="flex justify-center gap-2 mt-7">
            {TESTIMONIALS.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index % count ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
