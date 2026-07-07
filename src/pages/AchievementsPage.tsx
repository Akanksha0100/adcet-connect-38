import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Loader2, ExternalLink, FileText, ImagePlus, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

const STORAGE_BASE =
  (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
  "http://localhost:9000/adcet-alumni";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  imageKey?: string | null;
  attachmentKey?: string | null;
  link?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user?: { firstName?: string; lastName?: string };
}

const AchievementsPage = () => {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["achievements", "approved"],
    queryFn: () => api.get<{ items: Achievement[] }>("/achievements", { status: "APPROVED", pageSize: 30 }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">Celebrating alumni accomplishments</p>
        </div>
        <CreateAchievementDialog onCreated={() => qc.invalidateQueries({ queryKey: ["achievements"] })} />
      </div>

      {list.isLoading && <LoadingGrid />}
      {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
        <EmptyState icon={Trophy} title="No achievements yet" description="Submit yours to be featured." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((a) => (
          <div key={a.id} className="card-elevated overflow-hidden space-y-0 hover:-translate-y-0.5 transition-transform">
            {a.imageKey && (
              <Link to={`/achievements/${a.id}`} className="block h-32 bg-muted">
                <img src={`${STORAGE_BASE}/${a.imageKey}`} alt={a.title} className="w-full h-full object-cover" />
              </Link>
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : "Alumni"}
                  </p>
                  {a.occurredOn && <p className="text-xs text-muted-foreground">{new Date(a.occurredOn).toLocaleDateString()}</p>}
                </div>
              </div>
              <Link to={`/achievements/${a.id}`} className="block">
                <h3 className="font-medium text-foreground text-sm hover:underline">{a.title}</h3>
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                {a.category && <Badge variant="secondary" className="text-xs">{a.category}</Badge>}
                {a.link && (
                  <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Link
                  </a>
                )}
                {a.attachmentKey && (
                  <a href={`${STORAGE_BASE}/${a.attachmentKey}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Document
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const EMPTY_FORM = { title: "", description: "", category: "", occurredOn: "", link: "" };
const ATTACHMENT_ACCEPT = "application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Presign + PUT a file to storage, returning its object key. */
const uploadFile = async (file: File): Promise<string> => {
  const presign = await api.post<{ uploadUrl: string; key: string }>("/uploads/presign", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    scope: "achievement",
  });
  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return presign.key;
};

const CreateAchievementDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [attachmentKey, setAttachmentKey] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [imgUploading, setImgUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setForm(EMPTY_FORM);
    setImageKey(null);
    setAttachmentKey(null);
    setAttachmentName("");
  };

  const create = useMutation({
    mutationFn: () => api.post("/achievements", {
      title: form.title,
      description: form.description,
      category: form.category || undefined,
      occurredOn: form.occurredOn ? new Date(form.occurredOn).toISOString() : undefined,
      link: form.link || undefined,
      imageKey: imageKey || undefined,
      attachmentKey: attachmentKey || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Submitted", description: "Pending admin approval." });
      setOpen(false); onCreated(); reset();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image", variant: "destructive" });
      return;
    }
    setImgUploading(true);
    try { setImageKey(await uploadFile(file)); }
    catch (e: any) { toast({ title: "Image upload failed", description: e?.message, variant: "destructive" }); }
    finally { setImgUploading(false); }
  };

  const handleDoc = async (file: File) => {
    setDocUploading(true);
    try { setAttachmentKey(await uploadFile(file)); setAttachmentName(file.name); }
    catch (e: any) { toast({ title: "Upload failed", description: e?.message, variant: "destructive" }); }
    finally { setDocUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Academic, Sports..." /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Link <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
          </div>

          {/* Cover image */}
          <div className="space-y-1.5">
            <Label>Cover image <span className="text-muted-foreground font-normal">(optional — shown on cards & home slider)</span></Label>
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }} />
            {imageKey ? (
              <div className="flex items-center gap-2">
                <img src={`${STORAGE_BASE}/${imageKey}`} alt="cover" className="h-14 w-20 object-cover rounded-md border border-border" />
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setImageKey(null)}>
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={imgUploading} onClick={() => imgRef.current?.click()}>
                {imgUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Upload image
              </Button>
            )}
          </div>

          {/* Certificate / document */}
          <div className="space-y-1.5">
            <Label>Certificate / document <span className="text-muted-foreground font-normal">(optional — PDF, DOC or image)</span></Label>
            <input ref={docRef} type="file" accept={ATTACHMENT_ACCEPT} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDoc(f); e.target.value = ""; }} />
            {attachmentKey ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate flex-1 text-muted-foreground">{attachmentName || "Attached"}</span>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => { setAttachmentKey(null); setAttachmentName(""); }}>
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={docUploading} onClick={() => docRef.current?.click()}>
                {docUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload document
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || imgUploading || docUploading}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementsPage;
