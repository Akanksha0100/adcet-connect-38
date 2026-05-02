import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Newspaper, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { DEFAULT_CONTENT, type SiteContentKey } from "@/lib/siteContent";
import SupportContactForm from "@/components/SupportContactForm";

interface Props {
  contentKey: SiteContentKey;
}

interface Section {
  key: string;
  title: string;
  body: string;
}
interface NewsItem {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  publishedAt: string;
}
interface ResourceItem {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  category?: string | null;
}
interface Paginated<T> {
  items: T[];
}

/** Renders a section: backend-stored title/body + (for news/resources) backend list. */
const StaticContentPage = ({ contentKey }: Props) => {
  const fallback = DEFAULT_CONTENT[contentKey];

  const sectionQ = useQuery({
    queryKey: ["content", "section", contentKey],
    queryFn: () => api.get<Section | null>(`/content/sections/${contentKey}`),
  });
  const newsQ = useQuery({
    queryKey: ["content", "news"],
    queryFn: () => api.get<Paginated<NewsItem>>("/content/news", { pageSize: 50 }),
    enabled: contentKey === "news",
  });
  const resourcesQ = useQuery({
    queryKey: ["content", "resources"],
    queryFn: () => api.get<Paginated<ResourceItem>>("/content/resources", { pageSize: 50 }),
    enabled: contentKey === "resources",
  });

  const title = sectionQ.data?.title ?? fallback.title;
  const body = sectionQ.data?.body ?? fallback.body;

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

      {contentKey === "resources" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Resources
          </h2>
          {resourcesQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (resourcesQ.data?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No resources yet.</p>
          ) : (
            resourcesQ.data!.items.map((r) => (
              <article key={r.id} className="card-elevated p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{r.title}</h3>
                  {r.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {r.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {r.body}
                </p>
                {r.link && (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open resource <ExternalLink className="h-3 w-3" />
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