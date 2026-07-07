import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Trophy, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import RejectReasonDialog from "@/components/RejectReasonDialog";

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  imageKey?: string | null;
  attachmentKey?: string | null;
  link?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user?: { id: string; firstName: string; lastName: string } | null;
}
interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const STORAGE_BASE =
  (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
  "http://localhost:9000/adcet-alumni";

const tabs = ["Pending", "Approved"] as const;

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const AchievementsAdminPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const isPending = tab === "Pending";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "achievements", isPending],
    queryFn: () =>
      isPending
        ? api.get<Paginated<AchievementItem>>("/achievements/pending", { pageSize: 50 })
        : api.get<Paginated<AchievementItem>>("/achievements", { status: "APPROVED", pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.post(`/achievements/${id}/moderate`, { status, reason }),
    onSuccess: (_d, v) => {
      toast({ title: `Achievement ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
    },
    onError: (e: Error) =>
      toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const items = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">Review alumni achievements.</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title="No achievements" description="Nothing to review here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="card-elevated overflow-hidden hover:-translate-y-0.5">
              {a.imageKey ? (
                <img src={`${STORAGE_BASE}/${a.imageKey}`} alt={a.title} className="h-24 w-full object-cover" />
              ) : (
                <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
                  🏆
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{a.title}</h3>
                    {a.user ? (
                      <Link
                        to={`/admin/users/${a.user.id}`}
                        className="text-xs text-muted-foreground mt-0.5 truncate hover:underline hover:text-foreground block"
                        title="View user details"
                      >
                        {a.user.firstName} {a.user.lastName}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">Unknown</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] capitalize ${statusColors[a.status]}`}>
                    {a.status.toLowerCase()}
                  </Badge>
                </div>
                {a.category && <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>}
                <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                {(a.link || a.attachmentKey) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Link
                      </a>
                    )}
                    {a.attachmentKey && (
                      <a href={`${STORAGE_BASE}/${a.attachmentKey}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Document
                      </a>
                    )}
                  </div>
                )}
                {a.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: a.id, status: "APPROVED" })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5"
                      disabled={moderate.isPending}
                      onClick={() => setRejectId(a.id)}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <RejectReasonDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Reject achievement"
        description="The author will be notified with the reason."
        pending={moderate.isPending}
        onConfirm={async (reason) => {
          if (rejectId) await moderate.mutateAsync({ id: rejectId, status: "REJECTED", reason });
        }}
      />
    </motion.div>
  );
};

export default AchievementsAdminPage;
