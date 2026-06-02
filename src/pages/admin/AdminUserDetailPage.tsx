import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Building, GraduationCap, MapPin, Phone, Linkedin, Github, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
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
            <SendMessageDialog userId={data.id} recipient={name} />
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

const SendMessageDialog = ({ userId, recipient }: { userId: string; recipient: string }) => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const send = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/message`, { subject, body }),
    onSuccess: () => {
      toast({ title: "Message sent", description: `${recipient} will see this in notifications.` });
      setOpen(false);
      setSubject("");
      setBody("");
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" aria-label="Send message">
          <MessageSquare className="h-4 w-4" /> Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a message to {recipient}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea required rows={6} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={send.isPending} className="gap-1.5">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};