import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Calendar, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const STORAGE_BASE =
  (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
  "http://localhost:9000/adcet-alumni";

interface PublicAchievement {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  imageKey?: string | null;
  attachmentKey?: string | null;
  link?: string | null;
  createdAt: string;
  user?: { firstName?: string; lastName?: string } | null;
}

export default function AchievementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievement", "public", id],
    queryFn: () => api.get<PublicAchievement>(`/achievements/public/${id}`),
    enabled: !!id,
  });

  const authorName = data?.user
    ? `${data.user.firstName ?? ""} ${data.user.lastName ?? ""}`.trim() || "Alumnus"
    : "Alumnus";
  const imageUrl = data?.imageKey ? `${STORAGE_BASE}/${data.imageKey}` : undefined;
  const attachmentUrl = data?.attachmentKey ? `${STORAGE_BASE}/${data.attachmentKey}` : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center px-6 gap-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="ADCET" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-sm hidden sm:block">ADCET Alumni Portal</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
          <Button size="sm" asChild><Link to="/login">Join Network</Link></Button>
        </div>
      </header>

      <main className="flex-1 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {isError && (
            <div className="text-center py-20">
              <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
              <h1 className="text-xl font-bold">Achievement not found</h1>
              <p className="text-sm text-muted-foreground mt-1">
                This achievement may have been removed or is not published.
              </p>
              <Button className="mt-6" asChild><Link to="/">Go home</Link></Button>
            </div>
          )}

          {data && (
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated overflow-hidden"
            >
              {imageUrl ? (
                <img src={imageUrl} alt={data.title} className="w-full max-h-96 object-cover" />
              ) : (
                <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-6xl">
                  🏆
                </div>
              )}
              <div className="p-6 sm:p-8 space-y-5">
                <div className="space-y-2">
                  {data.category && <Badge variant="secondary" className="text-xs">{data.category}</Badge>}
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{data.title}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="h-4 w-4" /> {authorName}
                    </span>
                    {data.occurredOn && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> {new Date(data.occurredOn).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
                  {data.description}
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {data.link && (
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <a href={data.link} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Related link
                      </a>
                    </Button>
                  )}
                  {attachmentUrl && (
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <a href={attachmentUrl} target="_blank" rel="noreferrer">
                        <FileText className="h-3.5 w-3.5" /> View certificate / document
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.article>
          )}

          <div className="text-center mt-10 p-6 rounded-xl bg-muted/40">
            <p className="text-sm text-muted-foreground mb-3">
              Are you an ADCET alumnus? Join the network to share your achievements.
            </p>
            <Button asChild><Link to="/login">Join the Alumni Network</Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
