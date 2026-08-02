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
import { storageUrl } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import AchievementCardMedia from "@/components/AchievementCardMedia";

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
  rejectionReason?: string | null;
  user?: { firstName?: string; lastName?: string };
}

const STATUS_STYLES: Record<Achievement["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const initialsOf = (u?: { firstName?: string; lastName?: string }) =>
  `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "A";

/**
 * One achievement card. `showStatus` is on for the author's own submissions,
 * where the moderation state (and any rejection reason) is the whole point —
 * before this, a submission vanished until an admin approved it.
 */
const AchievementCard = ({ a, showStatus }: { a: Achievement; showStatus?: boolean }) => (
  <div className="card-elevated overflow-hidden flex flex-col h-full hover:-translate-y-0.5 hover:shadow-lg transition-all">
    <Link to={`/achievements/${a.id}`} className="block">
      <AchievementCardMedia item={a} />
    </Link>

    <div className="p-5 flex flex-col flex-1 gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
          {initialsOf(a.user)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : "Alumni"}
          </p>
          {a.occurredOn && (
            <p className="text-xs text-muted-foreground">
              {new Date(a.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        {showStatus && (
          <Badge className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[a.status]}`}>
            {a.status.toLowerCase()}
          </Badge>
        )}
      </div>

      <Link to={`/achievements/${a.id}`} className="block">
        <h3 className="font-semibold text-foreground text-sm hover:underline line-clamp-2">{a.title}</h3>
      </Link>
      {/* Fixed line count keeps every card in a row the same height. */}
      <p className="text-xs text-muted-foreground line-clamp-3">{a.description}</p>

      {showStatus && a.status === "REJECTED" && a.rejectionReason && (
        <p className="text-xs rounded-md bg-destructive/10 text-destructive px-2.5 py-2">
          <span className="font-medium">Not approved:</span> {a.rejectionReason}
        </p>
      )}
      {showStatus && a.status === "PENDING" && (
        <p className="text-xs text-muted-foreground italic">Waiting for admin review — only you can see this.</p>
      )}

      {/* Pinned to the bottom so links line up across the row. */}
      <div className="flex flex-wrap items-center gap-3 mt-auto pt-1">
        {a.link && (
          <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Link
          </a>
        )}
        {a.attachmentKey && (
          <a href={storageUrl(a.attachmentKey)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> Document
          </a>
        )}
      </div>
    </div>
  </div>
);

const TABS = ["All Achievements", "My Submissions"] as const;

const AchievementsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Achievements");
  const mine = tab === "My Submissions";

  const list = useQuery({
    queryKey: ["achievements", mine ? "mine" : "approved"],
    queryFn: () =>
      api.get<{ items: Achievement[] }>(
        "/achievements",
        mine ? { mine: true, pageSize: 30 } : { status: "APPROVED", pageSize: 30 },
      ),
  });

  const items = list.data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">Celebrating alumni accomplishments</p>
        </div>
        <CreateAchievementDialog onCreated={() => qc.invalidateQueries({ queryKey: ["achievements"] })} />
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.isLoading && <LoadingGrid />}
      {!list.isLoading && items.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={mine ? "You haven't submitted anything yet" : "No achievements yet"}
          description={mine ? "Add an achievement and track its approval here." : "Submit yours to be featured."}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {items.map((a) => (
          <AchievementCard key={a.id} a={a} showStatus={mine} />
        ))}
      </div>
    </motion.div>
  );
};

const EMPTY_FORM = { title: "", description: "", category: "", occurredOn: "", link: "" };
const ATTACHMENT_ACCEPT = "application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
    try { setImageKey(await uploadFile(file, "achievement")); }
    catch (e: any) { toast({ title: "Image upload failed", description: e?.message, variant: "destructive" }); }
    finally { setImgUploading(false); }
  };

  const handleDoc = async (file: File) => {
    setDocUploading(true);
    try { setAttachmentKey(await uploadFile(file, "achievement")); setAttachmentName(file.name); }
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
                <img src={storageUrl(imageKey)} alt="cover" className="h-14 w-20 object-cover rounded-md border border-border" />
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
