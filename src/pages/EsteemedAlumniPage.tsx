import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import {
  ESTEEMED_ALUMNI,
  ESTEEMED_CATEGORIES,
  ESTEEMED_GENERAL_IMAGE,
  EsteemedAlumnus,
  subtitleOf,
} from "@/lib/esteemed";

function AlumnusCard({ a }: { a: EsteemedAlumnus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-xl border border-border bg-card p-5 text-center hover:border-primary/40 hover:shadow-md transition-all"
    >
      <img
        src={a.photo}
        alt={a.name}
        loading="lazy"
        className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full object-cover object-top ring-2 ring-border"
      />
      <p className="mt-4 text-sm font-semibold text-foreground leading-snug">{a.name}</p>
      {subtitleOf(a) && <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtitleOf(a)}</p>}
      {a.batch && a.position && <p className="text-[11px] text-muted-foreground/80 mt-1">Batch of {a.batch}</p>}
    </motion.div>
  );
}

export default function EsteemedAlumniPage() {
  return (
    <PublicLayout title="Esteemed Alumni">
      <PageHero
        title="Esteemed Alumni"
        subtitle="Graduates whose achievements in industry, enterprise and public service carry the ADCET name forward."
      />

      {/* Composite board — full width so the individual portraits inside stay legible. */}
      <section className="bg-background border-b border-border">
        <img
          src={ESTEEMED_GENERAL_IMAGE}
          alt="ADCET esteemed alumni"
          className="w-full h-auto"
        />
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {ESTEEMED_CATEGORIES.map((cat) => {
          const members = ESTEEMED_ALUMNI.filter((a) => a.category === cat.id);
          return (
            <section key={cat.id} id={cat.id} className="scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{cat.title}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{cat.description}</p>
              {members.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {members.map((a) => (
                    <AlumnusCard key={a.name} a={a} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    This section is being updated. Alumni profiles will be published here shortly.
                  </p>
                </div>
              )}
            </section>
          );
        })}

        <section id="all" className="scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">All Esteemed Alumni</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
            Alumni featured by the Alumni Cell across departments and graduating batches.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {ESTEEMED_ALUMNI.map((a) => (
              <AlumnusCard key={a.name} a={a} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Know an Alumnus Who Belongs Here?</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            The Alumni Cell welcomes nominations. Write to us with the alumnus' name, batch, department and current
            role, and our team will get in touch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/contact">Nominate an Alumnus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">Join the Network</Link>
            </Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
