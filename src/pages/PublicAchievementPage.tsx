import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import AchievementArticle, { type AchievementArticleData } from "@/components/AchievementArticle";

/**
 * A shared achievement link, for visitors who are not signed in.
 *
 * This is the **public** face of `/achievements/:id`: its own slim header, a
 * back link to the landing page and a sign-up CTA, reading the anonymous
 * `/achievements/public/:id` endpoint (published items only). Members reach the
 * same achievement through `/dashboard/achievements/:id`, which keeps the portal
 * nav and sidebar — never send an in-portal link here, or the shell disappears
 * and Back walks the reader out to the public site.
 */
export default function PublicAchievementPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievement", "public", id],
    queryFn: () => api.get<AchievementArticleData>(`/achievements/public/${id}`),
    enabled: !!id,
  });

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
          <Button size="sm" asChild><Link to="/register">Join Network</Link></Button>
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

          {data && <AchievementArticle item={data} />}

          <div className="text-center mt-10 p-6 rounded-xl bg-muted/40">
            <p className="text-sm text-muted-foreground mb-3">
              Are you an ADCET alumnus? Join the network to share your achievements.
            </p>
            <Button asChild><Link to="/register">Join the Alumni Network</Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
