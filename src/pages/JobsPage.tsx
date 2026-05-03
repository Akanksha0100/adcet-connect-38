import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Briefcase, Building2, Users2, Plus, Loader2, BriefcaseBusiness } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  isRemote?: boolean;
  employmentType?: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
  experienceMin?: number | null;
  experienceMax?: number | null;
  description: string;
  vacancies?: number | null;
  positionsFilled?: number | null;
  applyUrl?: string | null;
  expiresAt?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}
interface Paginated<T> { items: T[] }

function hiringBadge(vacancies?: number | null, filled?: number | null) {
  if (!vacancies) return { label: "Open", className: "bg-accent/10 text-accent border-accent/20" };
  const remaining = vacancies - (filled ?? 0);
  if (remaining <= 2) return { label: "Limited Hiring", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (remaining >= 10) return { label: "Hiring Now 🔥", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  return { label: `${remaining} Vacancies`, className: "bg-accent/10 text-accent border-accent/20" };
}

const JobsPage = () => {
  const [q, setQ] = useState("");
  const [employmentType, setEmploymentType] = useState<string>("all");
  const [location, setLocation] = useState("");
  const qc = useQueryClient();

  const jobs = useQuery({
    queryKey: ["jobs", { q, employmentType, location }],
    queryFn: () => api.get<Paginated<Job>>("/jobs", {
      q: q || undefined,
      employmentType: employmentType === "all" ? undefined : employmentType,
      location: location || undefined,
      pageSize: 30,
    }),
  });

  const apply = useMutation({
    mutationFn: (id: string) => api.post(`/jobs/${id}/apply`, { coverLetter: "" }),
    onSuccess: () => toast({ title: "Application submitted" }),
    onError: (e: any) => toast({ title: "Apply failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs & Opportunities</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse jobs posted by alumni and partner companies</p>
        </div>
        <CreateJobDialog onCreated={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs, companies..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={employmentType} onValueChange={setEmploymentType}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="FULL_TIME">Full-time</SelectItem>
            <SelectItem value="PART_TIME">Part-time</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Location" className="w-full sm:w-40" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      {jobs.isLoading && <LoadingGrid />}
      {!jobs.isLoading && (jobs.data?.items.length ?? 0) === 0 && (
        <EmptyState icon={BriefcaseBusiness} title="No jobs found" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.data?.items.map((job) => {
          const badge = hiringBadge(job.vacancies, job.positionsFilled);
          const fillPercent = job.vacancies
            ? Math.round(((job.positionsFilled ?? 0) / job.vacancies) * 100)
            : 0;
          return (
            <Link
              key={job.id}
              to={`/dashboard/jobs/${job.id}`}
              className="card-elevated p-5 space-y-3 hover:-translate-y-0.5 transition-transform block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" /> {job.company}
                  </p>
                </div>
                {job.isRemote && (
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Remote</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>{badge.label}</span>
                {job.vacancies != null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users2 className="h-3 w-3" /> {job.vacancies} positions
                  </span>
                )}
              </div>

              {job.vacancies != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{job.positionsFilled ?? 0} filled</span>
                    <span>{job.vacancies - (job.positionsFilled ?? 0)} remaining</span>
                  </div>
                  <Progress value={fillPercent} className="h-1.5" />
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                {job.employmentType && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.employmentType.replace("_", "-").toLowerCase()}</span>}
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-border">
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={apply.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    apply.mutate(job.id);
                  }}
                >
                  {apply.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply Now"}
                </Button>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};

const CreateJobDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", company: "", location: "", description: "",
    employmentType: "FULL_TIME" as Job["employmentType"], vacancies: "",
  });
  const create = useMutation({
    mutationFn: () => api.post("/jobs", {
      ...form,
      vacancies: form.vacancies ? Number(form.vacancies) : undefined,
    }),
    onSuccess: () => {
      toast({ title: "Job submitted", description: "Awaiting admin approval." });
      setOpen(false); onCreated();
      setForm({ title: "", company: "", location: "", description: "", employmentType: "FULL_TIME", vacancies: "" });
    },
    onError: (e: any) => toast({ title: "Could not post job", description: e?.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Post Job</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Post a Job</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Company</Label><Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Vacancies</Label><Input type="number" min={1} value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v as Job["employmentType"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JobsPage;
