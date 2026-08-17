import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ALUMNI_NETWORK_MESSAGE } from "@/lib/public-content";

/**
 * The alumni network welcome, collapsed to a short read.
 *
 * The full text runs to four dense paragraphs, which pushed everything below it
 * off the landing page. Collapsed, it shows the opening paragraph clamped to six
 * lines; "Read more" reveals the rest in place.
 *
 * The clamp is applied to a single paragraph rather than the whole block on
 * purpose — `line-clamp` counts lines within one block, so clamping a container
 * of several `<p>`s would cut at a paragraph boundary instead of at six lines.
 */
export default function AlumniNetworkMessage() {
  const [expanded, setExpanded] = useState(false);
  const [intro, ...rest] = ALUMNI_NETWORK_MESSAGE.paragraphs;

  return (
    <section className="py-16 px-6 bg-background border-y border-border">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            {ALUMNI_NETWORK_MESSAGE.title}
          </h2>
          <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-8" />

          <div
            id="alumni-network-message"
            className="space-y-4 text-sm sm:text-[15px] text-muted-foreground leading-relaxed text-justify"
          >
            <p className={expanded ? undefined : "line-clamp-6"}>{intro}</p>
            {expanded && rest.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {expanded && (
            <p className="text-center text-base font-medium text-foreground mt-8">
              {ALUMNI_NETWORK_MESSAGE.closing}
            </p>
          )}

          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls="alumni-network-message"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              {expanded ? "Read less" : "Read more"}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
