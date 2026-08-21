import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Trophy, ExternalLink, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { storageUrl } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import RejectReasonDialog from "@/components/RejectReasonDialog";
import AchievementCardMedia from "@/components/AchievementCardMedia";
import { safeExternalUrl } from "@/lib/urls";

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
  rejectionReason?: string | null;
  user?: { id: string; firstName: string; lastName: string } | null;
}
interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const tabs = ["Pending", "Approved", "Rejected"] as const;

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const AchievementsAdminPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "achievements", tab, debounced],
    queryFn: () =>
      api.get<Paginated<AchievementItem>>("/achievements", {
        status: tab.toUpperCase(),
        q: debounced || undefined,
        pageSize: 50,
      }),
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

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title="No achievements" description="Nothing to review here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="card-elevated overflow-hidden flex flex-col h-full hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <Link to={`/achievements/${a.id}`} className="block" title="Open achievement">
                <AchievementCardMedia item={a} />
              </Link>
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2">{a.title}</h3>
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
                  <Badge className={`text-[10px] capitalize shrink-0 ${statusColors[a.status]}`}>
                    {a.status.toLowerCase()}
                  </Badge>
                </div>

                {/* Fixed line count keeps every card in a row the same height. */}
                <p className="text-xs text-muted-foreground line-clamp-3">{a.description}</p>

                {a.status === "REJECTED" && a.rejectionReason && (
                  <p className="text-xs rounded-md bg-destructive/10 text-destructive px-2.5 py-2">
                    <span className="font-medium">Reason:</span> {a.rejectionReason}
                  </p>
                )}

                {(a.link || a.attachmentKey || a.occurredOn) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {a.occurredOn && (
                      <span>
                        {new Date(a.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {a.link && (
                      <a href={safeExternalUrl(a.link)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Link
                      </a>
                    )}
                    {a.attachmentKey && (
                      <a href={storageUrl(a.attachmentKey)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Document
                      </a>
                    )}
                  </div>
                )}

                {/* Actions pinned to the bottom so they align across the row. */}
                <div className="mt-auto pt-1">
                  {a.status === "PENDING" && (
                    <div className="flex gap-2">
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
                  {/* A decision is reversible — an approved entry can be pulled
                      back down, and a rejected one reinstated. */}
                  {a.status === "APPROVED" && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-destructive"
                      disabled={moderate.isPending}
                      onClick={() => setRejectId(a.id)}>
                      <XCircle className="h-3.5 w-3.5" /> Revoke approval
                    </Button>
                  )}
                  {a.status === "REJECTED" && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: a.id, status: "APPROVED" })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve after all
                    </Button>
                  )}
                </div>
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
