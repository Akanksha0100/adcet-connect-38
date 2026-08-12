import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { ALUMNI_CELL, ALUMNI_NETWORK_MESSAGE } from "@/lib/public-content";
import { BOARD_MEMBERS, initialsOf } from "@/lib/board";
import { ALUMNI_COUNT, ALUMNI_COUNT_YEARS, TOTAL_ALUMNI } from "@/lib/alumni-count";
import { CONTACT } from "@/lib/site";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

/** Renders a count cell, using an en dash where a programme had no batch. */
const cell = (v: number | null) => (v === null ? "–" : v.toLocaleString());

export default function AboutPage() {
  return (
    <PublicLayout title="About the Alumni Cell">
      <PageHero
        title="About the Alumni Cell"
        subtitle="Annasaheb Dange College of Engineering and Technology, Ashta"
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Message */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{ALUMNI_NETWORK_MESSAGE.title}</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed text-justify">
            {ALUMNI_NETWORK_MESSAGE.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="text-base font-medium text-foreground mt-6">{ALUMNI_NETWORK_MESSAGE.closing}</p>
        </motion.section>

        {/* Vision & Mission */}
        <motion.section {...fade} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-6 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">Vision</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{ALUMNI_CELL.vision}</p>
          </div>
          <div className="border border-border rounded-xl p-6 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">Mission</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {ALUMNI_CELL.mission.map((m, i) => (
                <li key={m} className="flex gap-2.5">
                  <span className="text-primary font-semibold shrink-0">M{i + 1}.</span>
                  <span className="leading-relaxed">{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Networking */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Networking with Alumni</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALUMNI_CELL.activities.map((a) => (
              <li key={a} className="flex gap-2.5 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                <span className="leading-relaxed">{a}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Association board */}
        <motion.section {...fade} id="board" className="scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Alumni Association Board</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="py-3 px-4 font-medium text-muted-foreground w-16">Sr. No.</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground w-24">Photo</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Designation</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground w-36">Authority</th>
                </tr>
              </thead>
              <tbody>
                {BOARD_MEMBERS.map((m, i) => (
                  <tr key={m.name} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          loading="lazy"
                          className="w-14 h-16 rounded-md object-cover object-top ring-1 ring-border"
                        />
                      ) : (
                        <div className="w-14 h-16 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                          {initialsOf(m.name)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{m.designation}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                        {m.authority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Alumni count */}
        <motion.section {...fade} id="alumni-count" className="scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Total Alumni Count</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="py-3 px-4 font-medium text-muted-foreground w-16">Sr. No.</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Department</th>
                  {ALUMNI_COUNT_YEARS.map((y) => (
                    <th key={y} className="py-3 px-4 font-medium text-muted-foreground text-right whitespace-nowrap">
                      {y}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-medium text-muted-foreground text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ALUMNI_COUNT.map((r, i) => (
                  <tr key={r.department} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 px-4 text-foreground">{r.department}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">{cell(r.upto2223)}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">{cell(r.y2324)}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">{cell(r.y2425)}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">{cell(r.y2526)}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-foreground tabular-nums">
                      {r.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td className="py-3 px-4 font-semibold text-foreground" colSpan={6}>
                    Total Alumni Count
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-primary tabular-nums">
                    {TOTAL_ALUMNI.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fade} className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Be Part of the ADCET Alumni Family</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Whether you graduated last year or two decades ago, your connection to ADCET never ends. Join the portal
            to reconnect, mentor current students and contribute to the legacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/register">Join the Network</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={CONTACT.website} target="_blank" rel="noopener noreferrer">
                Visit College Website ↗
              </a>
            </Button>
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
}
