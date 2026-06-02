/**
 * Lists jobs posted by the current user, with a per-job applications drawer
 * showing applicant snapshot + resume download, and Close / Reopen controls.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, BriefcaseBusiness, ChevronRight, Download, Loader2, Lock, Unlock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface JobRow {
  id: string;
  title: string;
  company: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isClosed: boolean;
  _count?: { applications: number };
}
interface Paginated<T> { items: T[] }

const MyJobPostsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "mine"],
    queryFn: () => api.get<Paginated<JobRow>>("/jobs/mine/posted", { pageSize: 50 }),
  });

  const setClosed = useMutation({
    mutationFn: ({ id, closed }: { id: string; closed: boolean }) =>
      api.post(`/jobs/${id}/close`, { closed }),
    onSuccess: () => {
      toast({ title: "Updated" });
      qc.invalidateQueries({ queryKey: ["jobs", "mine"] });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const items = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Job Posts</h1>
        <p className="text-muted-foreground text-sm mt-1">Track applications and close hiring when filled.</p>
      </div>

      {isLoading ? (
        <LoadingGrid count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="You haven't posted any jobs yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((j) => (
            <div key={j.id} className="card-elevated p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/dashboard/jobs/${j.id}`} className="font-semibold text-foreground hover:underline truncate block">
                    {j.title}
                  </Link>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-3 w-3" /> {j.company}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-[10px] capitalize">{j.status.toLowerCase()}</Badge>
                  {j.isClosed && <Badge variant="outline" className="text-[10px]">Closed</Badge>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {j._count?.applications ?? 0} applications
                </span>
                <ApplicationsSheet jobId={j.id} />
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant={j.isClosed ? "outline" : "default"}
                  className="flex-1 gap-1.5"
                  disabled={setClosed.isPending}
                  onClick={() => setClosed.mutate({ id: j.id, closed: !j.isClosed })}
                >
                  {j.isClosed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {j.isClosed ? "Reopen" : "Close hiring"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface Application {
  id: string;
  coverLetter?: string | null;
  resumeKey?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      phone?: string | null;
      city?: string | null;
      currentCompany?: string | null;
      currentRole?: string | null;
      linkedinUrl?: string | null;
    } | null;
  };
}

const ApplicationsSheet = ({ jobId }: { jobId: string }) => {
  const [open, setOpen] = useState(false);
  const apps = useQuery({
    queryKey: ["job-applications", jobId],
    queryFn: () => api.get<Application[]>(`/jobs/${jobId}/applications`),
    enabled: open,
  });

  const download = async (key: string) => {
    try {
      const { url } = await api.post<{ url: string }>("/uploads/presign-download", { key });
      window.open(url, "_blank");
    } catch (e) {
      toast({ title: "Download failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 text-xs">
          View <ChevronRight className="h-3 w-3" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Applications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {apps.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {apps.data?.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          {apps.data?.map((a) => (
            <div key={a.id} className="border border-border rounded-lg p-3 space-y-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{a.user.firstName} {a.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{a.user.email}</p>
              </div>
              {a.user.profile?.currentRole && (
                <p className="text-xs text-muted-foreground">
                  {a.user.profile.currentRole}
                  {a.user.profile.currentCompany ? ` @ ${a.user.profile.currentCompany}` : ""}
                </p>
              )}
              {a.coverLetter && (
                <p className="text-xs text-foreground bg-muted/50 rounded p-2 whitespace-pre-wrap">{a.coverLetter}</p>
              )}
              {a.resumeKey && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => download(a.resumeKey!)}>
                  <Download className="h-3 w-3" /> Resume
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MyJobPostsPage;