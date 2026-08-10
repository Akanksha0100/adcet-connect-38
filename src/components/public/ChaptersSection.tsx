import { motion } from "framer-motion";
import { MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_CHAPTER_ACCENT,
  FALLBACK_CHAPTERS,
  chapterImage,
  fetchChapters,
  type Chapter,
} from "@/lib/chapters";

/**
 * Public chapter showcase — informational only. Chapter membership is managed
 * by the alumni office (an admin invites you), so there is deliberately no
 * "Join" call to action here.
 */
export default function ChaptersSection() {
  // Public visitors have no session, so a failed request just falls back to the
  // seeded chapter list rather than leaving a hole in the landing page.
  const { data } = useQuery({
    queryKey: ["chapters", "public"],
    queryFn: () => fetchChapters(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const chapters: Chapter[] = data?.length ? data : FALLBACK_CHAPTERS;

  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Alumni Chapters</h2>
          <div className="w-16 h-0.5 bg-primary/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Wherever your career has taken you, an ADCET community is close by. Our regional chapters bring
            alumni together for reunions, mentorship and local events.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {chapters.map((c, i) => {
            const image = chapterImage(c);
            return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group"
            >
              {/* City photograph where we have one; the accent gradient otherwise. */}
              <div
                className={`relative h-32 flex items-end p-5 overflow-hidden ${
                  image ? "bg-muted" : `bg-gradient-to-br ${c.accent || DEFAULT_CHAPTER_ACCENT}`
                }`}
              >
                {image && (
                  <>
                    <img
                      src={image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Keeps the name legible over whatever the photo happens to show. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  </>
                )}
                <h3 className="relative text-lg font-semibold text-white drop-shadow-md">{c.name}</h3>
              </div>
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {c.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.city}
                    </span>
                  )}
                  {c.memberCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.memberCount.toLocaleString("en-IN")} member{c.memberCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{c.blurb}</p>
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
