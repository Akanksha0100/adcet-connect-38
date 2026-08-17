import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import AchievementArticle, { type AchievementArticleData } from "@/components/AchievementArticle";

/**
 * One achievement, in the portal — the sibling of `EventDetailPage` and
 * `JobDetailPage`.
 *
 * It renders *inside* `DashboardLayout`, so it is a plain content block with no
 * header or chrome of its own: the topbar, sidebar and theme come from the
 * layout, exactly like every other `/dashboard/*` page. The public
 * `PublicAchievementPage` is the shareable twin for visitors with no session.
 *
 * Two details worth keeping:
 *  - It reads the **authenticated** `/achievements/:id`, not the public one, so
 *    an author opening their own submission from "My Submissions" sees it while
 *    it is still pending instead of a "not found".
 *  - Back goes back through history, falling back to the achievements list when
 *    there is nowhere to return to (a deep link, or a fresh reload). It must
 *    never point at the public landing page — that walks a signed-in reader out
 *    of the portal, which is what this page used to do.
 */
export default function AchievementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievement", id],
    queryFn: () => api.get<AchievementArticleData>(`/achievements/${id}`),
    enabled: !!id,
  });

  /** `history.state.idx` is React Router's position in its own stack. */
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/dashboard/achievements");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

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
            It may have been removed by its author or the alumni office.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/dashboard/achievements")}>
            All achievements
          </Button>
        </div>
      )}

      {data && <AchievementArticle item={data} />}
    </motion.div>
  );
}
