import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Flag, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/utils";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import { PostMediaView } from "@/components/feed/PostMediaView";
import { authorName, authorSubtitle, type FeedAuthor, type Paginated, type PostMedia } from "@/lib/feed";

type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";

interface PostReport {
  id: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reporter: { id: string; firstName: string; lastName: string; email: string };
  post: {
    id: string;
    content?: string | null;
    createdAt: string;
    author: FeedAuthor;
    media: PostMedia[];
    _count: { likes: number; comments: number };
  };
}

const STATUS_BADGE: Record<ReportStatus, string> = {
  OPEN: "bg-amber-500/15 text-amber-600",
  ACTIONED: "bg-destructive/15 text-destructive",
  DISMISSED: "bg-muted text-muted-foreground",
};

/**
 * Admin review queue for member-reported posts. Admins can also delete any
 * post directly from the feed itself — this page is the reactive path.
 */
const FeedModerationPage = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [pendingDelete, setPendingDelete] = useState<PostReport | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feed-reports", status],
    queryFn: () => api.get<Paginated<PostReport>>("/feed/reports", { status, pageSize: 50 }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-feed-reports"] });

  const resolve = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "ACTIONED" | "DISMISSED" }) =>
      api.patch(`/feed/reports/${id}`, { status: next }),
    onSuccess: () => {
      toast({ title: "Report updated" });
      refresh();
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't update", description: errorMessage(err, "Try again"), variant: "destructive" }),
  });

  // Removing the offending post also closes the report as ACTIONED.
  const deletePost = useMutation({
    mutationFn: async (report: PostReport) => {
      await api.delete(`/feed/${report.post.id}`);
      // The report row is cascade-deleted with the post, so nothing to patch.
    },
    onSuccess: () => {
      setPendingDelete(null);
      toast({ title: "Post deleted", description: "The post and its report were removed." });
      refresh();
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't delete", description: errorMessage(err, "Try again"), variant: "destructive" }),
  });

  const items = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Feed Moderation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Posts flagged by members. Delete the post or dismiss the report.
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
        <TabsList>
          <TabsTrigger value="OPEN">Open</TabsTrigger>
          <TabsTrigger value="ACTIONED">Actioned</TabsTrigger>
          <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingGrid count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={Flag} title="Nothing to review" description={`No ${status.toLowerCase()} reports.`} />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card-elevated p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">
                      Post by {authorName(r.post.author)}
                    </p>
                    <Badge className={`${STATUS_BADGE[r.status]} border-0 text-[10px]`}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {authorSubtitle(r.post.author) || "—"} · {r.post._count.likes} likes ·{" "}
                    {r.post._count.comments} comments
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                {r.post.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-6">
                    {r.post.content}
                  </p>
                )}
                <PostMediaView media={r.post.media} />
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Reported by</span>{" "}
                {r.reporter.firstName} {r.reporter.lastName} ({r.reporter.email}): {r.reason}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={`/dashboard/feed/${r.post.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" /> View in feed
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => setPendingDelete(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete post
                </Button>
                {r.status === "OPEN" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate({ id: r.id, next: "DISMISSED" })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate({ id: r.id, next: "ACTIONED" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark actioned
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post, its media, likes, comments and all reports on it are permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deletePost.mutate(pendingDelete)}
              disabled={deletePost.isPending}
            >
              Delete post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default FeedModerationPage;
