import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

/**
 * Consistent banner at the top of every inner public page. Deliberately light —
 * the coloured gradient is reserved for the landing hero and its closing CTA.
 */
export default function PageHero({ title, subtitle, children }: Props) {
  return (
    <section className="border-b border-border bg-muted/30 py-12 sm:py-14 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
        {children}
      </motion.div>
    </section>
  );
}
