import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, MapPin, Briefcase, Users2, Calendar, Loader2, ExternalLink, Lock, Unlock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
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
  isClosed?: boolean;
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null;
  _count?: { applications: number };
}

const JobDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobDetail>(`/jobs/${id}`),
    enabled: !!id,
  });

  const setClosed = useMutation({
    mutationFn: (closed: boolean) => api.post(`/jobs/${id}/close`, { closed }),
    onSuccess: () => {
      toast({ title: "Updated" });
      qc.invalidateQueries({ queryKey: ["job", id] });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const isOwner = !!job && !!user && job.createdBy?.id === user.id;
  const canModerate = isOwner || isAdmin;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load job.</div>}
      {job && (
        <div className="card-elevated p-6 space-y-5">
          {job.isClosed && (
            <div className="rounded-lg border border-muted bg-muted/40 p-3 text-sm flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Applications are closed for this posting.</span>
            </div>
          )}
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
            <ApplyJobDialog jobId={job.id} disabled={job.isClosed || job.status !== "APPROVED"} />
            {job.applyUrl && (
              <Button variant="outline" asChild>
                <a href={job.applyUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                  External link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {canModerate && (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={setClosed.isPending}
                onClick={() => setClosed.mutate(!job.isClosed)}
              >
                {job.isClosed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {job.isClosed ? "Reopen" : "Close hiring"}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const ApplyJobDialog = ({ jobId, disabled }: { jobId: string; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const apply = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please attach your resume (PDF).");
      if (file.type !== "application/pdf") throw new Error("Resume must be a PDF.");
      setUploading(true);
      try {
        const { url, key } = await api.post<{ url: string; key: string }>("/uploads/presign", {
          fileName: file.name,
          contentType: "application/pdf",
          scope: "resume",
        });
        const put = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: file,
        });
        if (!put.ok) throw new Error("Resume upload failed");
        await api.post(`/jobs/${jobId}/apply`, { resumeKey: key, coverLetter });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast({ title: "Application submitted" });
      setOpen(false);
      setCoverLetter("");
      setFile(null);
    },
    onError: (e: Error) =>
      toast({ title: "Apply failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Apply Now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for this job</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Resume (PDF only)</Label>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cover letter (optional)</Label>
            <Textarea
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell the recruiter why you're a great fit…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={apply.isPending || uploading} className="gap-1.5">
              {apply.isPending || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailPage;