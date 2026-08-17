import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { ESTEEMED_CATEGORIES, EsteemedAlumnus, esteemedByCategory } from "@/lib/esteemed";

/**
 * One alumnus: a plain rectangular portrait, centred, with the name, batch and
 * designation centred beneath it. No card chrome and no circular crop — a
 * rectangle keeps the whole photograph, and heads sit near the top, so
 * `object-top` avoids cropping faces.
 *
 * `max-w-[9.5rem]` caps the tile so a wide viewport makes the *columns*
 * roomier rather than the portraits bigger; below that width the tile simply
 * fills its grid cell.
 */
function Alumnus({ a }: { a: EsteemedAlumnus }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full max-w-[9.5rem] mx-auto text-center"
    >
      <img
        src={a.photo}
        alt={a.name}
        loading="lazy"
        className="w-full aspect-[3/4] rounded-lg object-cover object-top bg-muted ring-1 ring-border"
      />
      <figcaption className="mt-2.5">
        <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug break-words">
          {a.name}
        </p>
        <p className="text-[11px] sm:text-xs font-medium text-primary mt-1 leading-snug">
          Batch of {a.batch}
        </p>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-snug break-words">
          {a.position}
        </p>
      </figcaption>
    </motion.figure>
  );
}

export default function EsteemedAlumniPage() {
  return (
    <PublicLayout title="Esteemed Alumni">
      <PageHero
        title="Esteemed Alumni"
        subtitle="Graduates whose achievements in industry, enterprise and public service carry the ADCET name forward."
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Every alumnus belongs to exactly one category, so these three
            sections between them cover the whole roster — there is deliberately
            no separate "All Esteemed Alumni" roll repeating them. */}
        {ESTEEMED_CATEGORIES.map((cat) => {
          const members = esteemedByCategory(cat.id);
          return (
            <section key={cat.id} id={cat.id} className="scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{cat.title}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{cat.description}</p>
              {members.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8">
                  {members.map((a) => (
                    <Alumnus key={a.name} a={a} />
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
              <Link to="/register">Join the Network</Link>
            </Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
