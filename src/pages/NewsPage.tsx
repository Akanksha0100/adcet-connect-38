import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { formatMonth, newsQuery } from "@/lib/newsroom";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

/** Entries come from `/admin/newsroom` — nothing here is hardcoded. */
export default function NewsPage() {
  const { data, isLoading, isError } = useQuery(newsQuery());
  const news = data?.items ?? [];

  return (
    <PublicLayout title="News & Announcements">
      <PageHero
        title="News & Announcements"
        subtitle="Updates from the ADCET campus and the alumni community"
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Updates */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Latest Updates</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-muted-foreground py-12">
              Updates are unavailable right now. Please try again shortly.
            </p>
          )}

          {!isLoading && !isError && news.length === 0 && (
            <p className="text-sm text-muted-foreground py-12">No announcements have been posted yet.</p>
          )}

          <div className="space-y-4">
            {news.map((n) => (
              <motion.article
                key={n.id}
                {...fade}
                className="border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  {n.tag && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {n.tag}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatMonth(n.publishedAt)}</span>
                </div>
                <h3 className="font-semibold text-foreground leading-snug mb-2">{n.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{n.body}</p>
                {n.link && (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
                  >
                    Read more <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fade} className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <Newspaper className="h-7 w-7 text-primary/40 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Get the Full Picture</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Sign in to see real-time announcements from the alumni office, event invitations and job postings shared
            by fellow alumni.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/login">Sign In for Full Access</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/newsletters">Read the Newsletter</Link>
            </Button>
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
}
