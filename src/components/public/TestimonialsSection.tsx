import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TESTIMONIALS } from "@/lib/testimonials";
import TestimonialCard from "./TestimonialCard";

/** Cards now show an excerpt, so they can rotate rather sooner than the full quotes did. */
const INTERVAL_MS = 8000;

/**
 * Horizontal slide: the incoming quote enters from the side you are heading
 * towards and the outgoing one leaves the opposite way, so going back reads as
 * going back. `direction` is +1 for next, -1 for previous.
 */
const SLIDE = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -56 : 56 }),
};

export default function TestimonialsSection() {
  const [[index, direction], setSlide] = useState<[number, number]>([0, 1]);
  const count = TESTIMONIALS.length;

  const go = useCallback(
    (dir: number) => setSlide(([i]) => [(i + dir + count) % count, dir]),
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(t);
  }, [count, go]);

  if (count === 0) return null;

  const t = TESTIMONIALS[index % count];

  return (
    <section className="py-16 px-6 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Testimonials</h2>
          <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">In our alumni's own words</p>
        </div>

        <div className="relative">
          {/* Clipped so the slide-in never widens the page on narrow screens. */}
          <div className="overflow-x-clip">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={index}
                custom={direction}
                variants={SLIDE}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <TestimonialCard testimonial={t} />
              </motion.div>
            </AnimatePresence>
          </div>

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
                onClick={() => setSlide(([current]) => [i, i >= current ? 1 : -1])}
                className={`h-2 rounded-full transition-all ${
                  i === index % count ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            to="/testimonials"
            className="text-sm font-medium text-primary hover:underline underline-offset-4"
          >
            Read all {count} testimonials
          </Link>
        </div>
      </div>
    </section>
  );
}
