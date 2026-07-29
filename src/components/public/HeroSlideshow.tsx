import { ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Campus photographs that sit behind the landing hero. */
const SLIDES = ["/adcet-back-1.png", "/adcet-back-2.png", "/adcet-back-3.png"];

const INTERVAL_MS = 6000;

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Full-bleed campus slideshow used as the landing hero backdrop. Slides advance
 * left-to-right on a timer; a dark scrim keeps the overlaid content readable
 * regardless of which photo is showing.
 */
export default function HeroSlideshow({ children, className = "" }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  // Warm the browser cache so later slides don't flash in.
  useEffect(() => {
    SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <section className={`relative isolate overflow-hidden ${className}`}>
      <div className="absolute inset-0 -z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <img
              src={SLIDES[index]}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </motion.div>
        </AnimatePresence>
        {/* Scrim — dark enough for white text on every photo. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/80" />
      </div>

      {children}

      {/* Slide indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Show campus photo ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-7 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
