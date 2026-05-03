import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Building, GraduationCap, MapPin, Phone, Linkedin, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api, type AppRole, type ApprovalStatus } from "@/lib/api";

interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt: string;
  roles: { role: AppRole }[];
  profile?: {
    department?: string | null;
    graduationYear?: number | null;
    currentCompany?: string | null;
    currentRole?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    bio?: string | null;
    skills?: string[] | null;
  } | null;
}

const AdminUserDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  });

  const name = data ? `${data.firstName} ${data.lastName}`.trim() || data.email : "";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load user.</div>}
      {data && (
        <div className="card-elevated p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {data.email}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">{data.status.toLowerCase()}</Badge>
                {data.roles.map((r) => (
                  <Badge key={r.role} variant="outline">{r.role}</Badge>
                ))}
              </div>
            </div>
          </div>

          {data.status === "REJECTED" && data.rejectionReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <span className="font-medium text-destructive">Rejection reason: </span>
              <span className="text-foreground">{data.rejectionReason}</span>
            </div>
          )}

          {data.profile?.bio && (
            <div>
              <h2 className="font-semibold text-foreground mb-1 text-sm">Bio</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {data.profile?.department && (
              <Field icon={<GraduationCap className="h-4 w-4" />} label="Department" value={data.profile.department} />
            )}
            {data.profile?.graduationYear && (
              <Field icon={<GraduationCap className="h-4 w-4" />} label="Batch" value={String(data.profile.graduationYear)} />
            )}
            {data.profile?.currentCompany && (
              <Field icon={<Building className="h-4 w-4" />} label="Company" value={data.profile.currentCompany} />
            )}
            {data.profile?.currentRole && (
              <Field icon={<Building className="h-4 w-4" />} label="Role" value={data.profile.currentRole} />
            )}
            {(data.profile?.city || data.profile?.country) && (
              <Field
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={[data.profile?.city, data.profile?.country].filter(Boolean).join(", ")}
              />
            )}
            {data.profile?.phone && (
              <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={data.profile.phone} />
            )}
          </div>

          {(data.profile?.linkedinUrl || data.profile?.githubUrl) && (
            <div className="flex gap-2">
              {data.profile.linkedinUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={data.profile.linkedinUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                </Button>
              )}
              {data.profile.githubUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={data.profile.githubUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                </Button>
              )}
            </div>
          )}

          {data.profile?.skills && data.profile.skills.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-2 text-sm">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.profile.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Joined {new Date(data.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const Field = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default AdminUserDetailPage;