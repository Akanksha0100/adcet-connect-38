import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import TestimonialCard from "@/components/public/TestimonialCard";
import { TESTIMONIALS } from "@/lib/testimonials";

/**
 * Every testimonial in full, reached by clicking a quote in the landing-page
 * carousel. Deliberately absent from the public nav — the carousel is the only
 * entry point, so the header keeps the same set of tabs it had before.
 */
export default function TestimonialsPage() {
  return (
    <PublicLayout title="Testimonials">
      <PageHero
        title="Testimonials"
        subtitle="In our alumni's own words — what ADCET meant to them, and how they stay involved."
      />

      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="space-y-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={`${t.name}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.05 }}
            >
              <TestimonialCard testimonial={t} full />
            </motion.div>
          ))}
        </div>

        <section className="border border-border rounded-2xl p-8 text-center bg-muted/20 mt-12">
          <h2 className="text-xl font-bold mb-2">Share Your Story</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Tell the Alumni Cell what ADCET meant to you — your words could be what convinces the next
            batch to stay connected.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/contact">Contact the Alumni Cell</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
