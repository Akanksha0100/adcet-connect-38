import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CHAPTERS } from "@/lib/chapters";

export default function ChaptersSection() {
  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Alumni Chapters</h2>
          <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Wherever your career has taken you, an ADCET community is close by. Join your city chapter to meet
            batchmates, mentor students and host local events.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CHAPTERS.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className={`h-24 bg-gradient-to-br ${c.accent} flex items-end p-5`}>
                <h3 className="text-lg font-semibold text-white drop-shadow-sm">{c.name}</h3>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{c.blurb}</p>
                {c.joinHref ? (
                  <Button size="sm" className="mt-5 w-full gap-1.5" asChild>
                    <Link to={c.joinHref}>
                      Join Now <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="mt-5 w-full gap-1.5"
                    onClick={() =>
                      toast.info(`${c.name} registration opens soon.`, {
                        description: "Sign in to the portal and we'll notify you when it goes live.",
                      })
                    }
                  >
                    Join Now <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
