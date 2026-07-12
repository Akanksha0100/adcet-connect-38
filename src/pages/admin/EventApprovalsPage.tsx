import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Users, Calendar, CalendarX, Loader2, ChevronRight, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DEPARTMENT_FILTER_OPTIONS as DEPARTMENTS } from "@/lib/departments";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";


interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  department?: string | null;
  attachmentKey?: string | null;
  status: string;
  _count?: { rsvps: number };
}

interface Rsvp {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; profile?: { graduationYear?: number | null; currentCompany?: string | null } | null };
}

const toLocal = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
const emptyForm = () => ({
  title: "", description: "", location: "", isOnline: false, meetingUrl: "",
  startsAt: "", endsAt: "", capacity: "", department: "All", attachmentKey: "",
});

const EventApprovalsPage = () => {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => api.get<{ items: EventItem[] }>("/events", { pageSize: 100 }),
  });
  const events = data?.items ?? [];

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setAttachFile(null); setFormOpen(true); };
  const openEdit = (e: EventItem) => {
    setEditing(e);
    setForm({
      title: e.title, description: e.description ?? "", location: e.location ?? "",
      isOnline: e.isOnline ?? false, meetingUrl: e.meetingUrl ?? "",
      startsAt: toLocal(e.startsAt), endsAt: toLocal(e.endsAt),
      capacity: e.capacity != null ? String(e.capacity) : "",
      department: e.department ?? "All",
      attachmentKey: e.attachmentKey ?? "",
    });
    setAttachFile(null);
    setFormOpen(true);
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    setAttachUploading(true);
    try {
      const { url, key } = await api.post<{ url: string; key: string }>("/uploads/presign", {
        scope: "event-attachment",
        filename: file.name,
        contentType: file.type,
      });
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      return key;
    } finally {
      setAttachUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      let attachmentKey = form.attachmentKey;
      if (attachFile) {
        attachmentKey = await uploadAttachment(attachFile);
      }
      const body = {
        ...form,
        attachmentKey: attachmentKey || undefined,
        department: form.department === "All" ? undefined : form.department,
        meetingUrl: form.isOnline ? form.meetingUrl : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      return editing
        ? api.patch(`/events/${editing.id}`, body)
        : api.post("/events", body);
    },
    onSuccess: () => {
      toast({ title: editing ? "Event updated" : "Event created", description: editing ? undefined : "Notifications will be sent to alumni." });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setFormOpen(false);
      setAttachFile(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      toast({ title: "Event deleted" });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Create, edit and manage all alumni events.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New Event
        </Button>
      </div>

      {isLoading ? <LoadingGrid count={4} /> : events.length === 0 ? (
        <EmptyState icon={CalendarX} title="No events yet" description="Create the first event." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((e) => (
            <div key={e.id} className="card-elevated overflow-hidden">
              <img src="/event-card-banner.svg" alt="" className="w-full h-20 object-cover" />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{e.title}</h3>
                  <div className="flex items-center gap-1">
                    {e.department && <Badge variant="outline" className="text-[10px]">{e.department}</Badge>}
                    <Badge variant="secondary" className="text-[10px] capitalize">{e.isOnline ? "Online" : "Offline"}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.startsAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e._count?.rsvps ?? 0} registered</span>
                  {e.attachmentKey && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />Attachment</span>}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <RsvpsSheet eventId={e.id} count={e._count?.rsvps ?? 0} />
                  <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => openEdit(e)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(e)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-1.5"><Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label>Description</Label>
              <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Department (target audience)</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="All alumni" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Email notifications will be sent to alumni in this department.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Starts</Label>
                <Input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Ends</Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Capacity</Label>
                <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm({ ...form, isOnline: e.target.checked })} />
              Online event
            </label>
            {form.isOnline && (
              <div className="space-y-1.5"><Label>Meeting URL</Label>
                <Input type="url" required={form.isOnline} placeholder="https://meet.google.com/..." value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Attachment (PDF, Image, or Doc)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => document.getElementById('admin-event-attach-input')?.click()}
                  disabled={attachUploading}
                >
                  {attachUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  {attachFile ? attachFile.name : (form.attachmentKey ? "Replace file" : "Choose file")}
                </Button>
                {(attachFile || form.attachmentKey) && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => { setAttachFile(null); setForm({ ...form, attachmentKey: "" }); }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                id="admin-event-attach-input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAttachFile(f);
                  e.target.value = "";
                }}
              />
              {form.attachmentKey && !attachFile && (
                <p className="text-xs text-muted-foreground">Existing attachment will be kept unless you choose a new file or remove it.</p>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending || attachUploading}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "Save Changes" : "Create & Notify")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the event and all RSVPs. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteTarget && del.mutate(deleteTarget.id)}>
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

const RsvpsSheet = ({ eventId, count }: { eventId: string; count: number }) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["event-rsvps", eventId],
    queryFn: () => api.get<Rsvp[]>(`/events/${eventId}/rsvps`),
    enabled: open,
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 text-xs">
          <Users className="h-3 w-3" /> {count} <ChevronRight className="h-3 w-3" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Registered Attendees ({count})</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          )}
          {data?.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-3 text-sm space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{r.user.firstName} {r.user.lastName}</p>
                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.user.email}</p>
              {(r.user.profile?.graduationYear || r.user.profile?.currentCompany) && (
                <p className="text-xs text-muted-foreground">
                  {r.user.profile?.graduationYear ? `Batch of ${r.user.profile.graduationYear}` : ""}
                  {r.user.profile?.currentCompany ? ` · ${r.user.profile.currentCompany}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EventApprovalsPage;
