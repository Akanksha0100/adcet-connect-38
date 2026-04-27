import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user?: { firstName: string; lastName: string } | null;
}
interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const tabs = ["Pending", "Approved"] as const;

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const AchievementsAdminPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Pending");
  const isPending = tab === "Pending";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "achievements", isPending],
    queryFn: () =>
      isPending
        ? api.get<Paginated<AchievementItem>>("/achievements/pending", { pageSize: 50 })
        : api.get<Paginated<AchievementItem>>("/achievements", { status: "APPROVED", pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.post(`/achievements/${id}/moderate`, { status }),
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
              <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
                🏆
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {a.user ? `${a.user.firstName} ${a.user.lastName}` : "Unknown"}
                    </p>
                  </div>
                  <Badge className={`text-[10px] capitalize ${statusColors[a.status]}`}>
                    {a.status.toLowerCase()}
                  </Badge>
                </div>
                {a.category && <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>}
                <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
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
                      onClick={() => moderate.mutate({ id: a.id, status: "REJECTED" })}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AchievementsAdminPage;
