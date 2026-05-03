import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, MapPin, Briefcase, Users2, Calendar, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface JobDetail {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  isRemote?: boolean;
  employmentType?: string;
  experienceMin?: number | null;
  experienceMax?: number | null;
  description: string;
  vacancies?: number | null;
  positionsFilled?: number | null;
  applyUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null;
  _count?: { applications: number };
}

const JobDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobDetail>(`/jobs/${id}`),
    enabled: !!id,
  });

  const apply = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/apply`, { coverLetter: "" }),
    onSuccess: () => toast({ title: "Application submitted" }),
    onError: (e: any) => toast({ title: "Apply failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load job.</div>}
      {job && (
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> {job.company}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">{job.status.toLowerCase()}</Badge>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {job.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}{job.isRemote ? " (Remote)" : ""}</span>}
            {job.employmentType && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.employmentType.replace("_", "-").toLowerCase()}</span>}
            {job.vacancies != null && <span className="flex items-center gap-1.5"><Users2 className="h-4 w-4" />{job.vacancies} positions ({(job.positionsFilled ?? 0)} filled)</span>}
            {job.expiresAt && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Closes {new Date(job.expiresAt).toLocaleDateString()}</span>}
          </div>

          {(job.experienceMin != null || job.experienceMax != null) && (
            <p className="text-sm text-muted-foreground">
              Experience: {job.experienceMin ?? 0}–{job.experienceMax ?? "∞"} years
            </p>
          )}

          <div>
            <h2 className="font-semibold text-foreground mb-2">Description</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>

          {job.createdBy && (
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Posted by{" "}
              <span className="font-medium text-foreground">
                {job.createdBy.firstName} {job.createdBy.lastName}
              </span>{" "}
              · {new Date(job.createdAt).toLocaleDateString()}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Now"}
            </Button>
            {job.applyUrl && (
              <Button variant="outline" asChild>
                <a href={job.applyUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                  External link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default JobDetailPage;