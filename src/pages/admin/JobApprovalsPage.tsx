import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Search, MapPin, Briefcase, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import RejectReasonDialog from "@/components/RejectReasonDialog";

interface JobItem {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  type?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const JobApprovalsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs-pending"],
    queryFn: () => api.get<Paginated<JobItem>>("/jobs/pending", { pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.post(`/jobs/${id}/moderate`, { status, reason }),
    onSuccess: (_d, v) => {
      toast({ title: `Job ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "jobs-pending"] });
    },
    onError: (e: Error) =>
      toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const jobs = (data?.items ?? []).filter(
    (j) =>
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve job postings.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs or companies..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : jobs.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No pending jobs" description="All caught up." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((j) => (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated p-5 space-y-3 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{j.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{j.company}</p>
                </div>
                <Badge className={`text-[10px] capitalize ${statusColors[j.status]}`}>
                  {j.status.toLowerCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {j.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {j.location}
                  </span>
                )}
                {j.type && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {j.type}
                  </span>
                )}
              </div>

              {j.status === "PENDING" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: j.id, status: "APPROVED" })}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    disabled={moderate.isPending}
                    onClick={() => setRejectId(j.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      <RejectReasonDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Reject job posting"
        description="The poster will be notified with the reason."
        pending={moderate.isPending}
        onConfirm={async (reason) => {
          if (rejectId) await moderate.mutateAsync({ id: rejectId, status: "REJECTED", reason });
        }}
      />
    </motion.div>
  );
};

export default JobApprovalsPage;
