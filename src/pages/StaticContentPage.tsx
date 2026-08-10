import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { DEFAULT_CONTENT, type SiteContentKey } from "@/lib/siteContent";
import { newsQuery } from "@/lib/newsroom";
import SupportContactForm from "@/components/SupportContactForm";

interface Props {
  contentKey: SiteContentKey;
}

/**
 * The two in-portal pages that are plain copy rather than a feature screen.
 * Intro text is fixed (`DEFAULT_CONTENT`); the news list is the same
 * admin-managed feed the public `/news` page renders.
 */
const StaticContentPage = ({ contentKey }: Props) => {
  const { title, body } = DEFAULT_CONTENT[contentKey];

  const newsQ = useQuery({ ...newsQuery(), enabled: contentKey === "news" });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="card-elevated p-6">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{body}</p>
      </div>

      {contentKey === "news" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-4 w-4" /> Latest News
          </h2>
          {newsQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (newsQ.data?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No news yet.</p>
          ) : (
            newsQ.data!.items.map((n) => (
              <article key={n.id} className="card-elevated p-5 space-y-2">
                <h3 className="font-semibold text-foreground">{n.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.publishedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {n.body}
                </p>
                {n.link && (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Read more <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {contentKey === "support" && <SupportContactForm />}
    </motion.div>
  );
};

export default StaticContentPage;
