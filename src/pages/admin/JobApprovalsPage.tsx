import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Search,
  MapPin,
  Briefcase,
  BriefcaseBusiness,
  User,
  Building2,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  employmentType?: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  isClosed?: boolean;
  createdAt?: string;
  createdBy?: { id: string; firstName: string; lastName: string; email?: string } | null;
  _count?: { applications: number };
}

interface Application {
  id: string;
  coverLetter?: string | null;
  resumeKey?: string | null;
  createdAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      city?: string | null;
      department?: string | null;
      graduationYear?: number | null;
      currentCompany?: string | null;
      currentRole?: string | null;
      linkedinUrl?: string | null;
    } | null;
  };
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
  const [filters, setFilters] = useState({
    q: "",
    company: "",
    location: "",
    status: "all",
    closed: "all",
    employmentType: "all",
  });
  const [rejectId, setRejectId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs", filters],
    queryFn: () =>
      api.get<Paginated<JobItem>>("/jobs/admin/all", {
        q: filters.q || undefined,
        company: filters.company || undefined,
        location: filters.location || undefined,
        status: filters.status === "all" ? undefined : filters.status,
        closed: filters.closed === "all" ? undefined : filters.closed === "closed",
        employmentType: filters.employmentType === "all" ? undefined : filters.employmentType,
        pageSize: 100,
      }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.post(`/jobs/${id}/moderate`, { status, reason }),
    onSuccess: (_d, v) => {
      toast({ title: `Job ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      qc.invalidateQueries({ queryKey: ["analytics", "admin-overview"] });
    },
    onError: (e: Error) =>
      toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const jobs = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
        <p className="text-muted-foreground text-sm mt-1">Review all jobs and inspect applicants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-9"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
        <Input
          placeholder="Company"
          value={filters.company}
          onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
        />
        <Input
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
        />
        <Select value={filters.status} onValueChange={(status) => setFilters((f) => ({ ...f, status }))}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.closed} onValueChange={(closed) => setFilters((f) => ({ ...f, closed }))}>
          <SelectTrigger><SelectValue placeholder="Open/Closed" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filters.employmentType === value ? "default" : "outline"}
            onClick={() => setFilters((f) => ({ ...f, employmentType: value }))}
          >
            {value === "all" ? "All Types" : value.replace("_", " ")}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : jobs.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No jobs match these filters" />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated p-5 space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/dashboard/jobs/${j.id}`} className="font-semibold text-foreground hover:underline">
                      {j.title}
                    </Link>
                    <Badge className={`text-[10px] capitalize ${statusColors[j.status]}`}>
                      {j.status.toLowerCase()}
                    </Badge>
                    {j.isClosed && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Lock className="h-3 w-3" /> Closed
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {j.company}
                    </span>
                    {j.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {j.location}
                      </span>
                    )}
                    {j.employmentType && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {j.employmentType.replace("_", " ")}
                      </span>
                    )}
                    {j.createdBy && (
                      <Link
                        to={`/admin/users/${j.createdBy.id}`}
                        className="flex items-center gap-1 hover:underline hover:text-foreground"
                        title="View user details"
                      >
                        <User className="h-3 w-3" />
                        {j.createdBy.firstName} {j.createdBy.lastName}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationsSheet jobId={j.id} count={j._count?.applications ?? 0} />
                  {j.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
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
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
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

const ApplicationsSheet = ({ jobId, count }: { jobId: string; count: number }) => {
  const [open, setOpen] = useState(false);
  const apps = useQuery({
    queryKey: ["admin", "job-applications", jobId],
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
        <Button size="sm" variant="outline" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {count} applicants
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Job Applicants</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {apps.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {apps.data?.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          {apps.data?.map((a) => (
            <div key={a.id} className="border border-border rounded-lg p-3 space-y-2 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {a.user.firstName} {a.user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{a.user.email}</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {a.user.profile?.department && <span>{a.user.profile.department}</span>}
                {a.user.profile?.graduationYear && <span>{a.user.profile.graduationYear}</span>}
                {a.user.profile?.city && <span>{a.user.profile.city}</span>}
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

export default JobApprovalsPage;
