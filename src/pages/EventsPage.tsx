import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Users, Calendar as CalIcon, Plus, Loader2, CalendarOff, Paperclip, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";

interface EventItem {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  isOnline?: boolean;
  department?: string | null;
  attachmentKey?: string | null;
  startsAt: string;
  endsAt?: string;
  capacity?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  _count?: { rsvps: number };
}

const DEPARTMENTS = [
  "All", "CSE", "CSE (IoT & Cyber Security)", "CSE (AI & Data Science)",
  "Robotics & Automation", "Mechanical Engineering", "Electrical Engineering",
  "Civil Engineering", "Aeronautical Engineering", "Food Technology", "E&TC",
];

const PAGE_SIZE = 12;

interface PaginationInfo { total: number; page: number; pageSize: number; totalPages: number }
interface Paginated<T> { items: T[]; pagination: PaginationInfo }

const tabs = ["Upcoming", "Past"] as const;

const EventsPage = () => {
  const [tab, setTab] = useState<typeof tabs[number]>("Upcoming");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "online" | "offline">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const events = useQuery({
    queryKey: ["events", { tab, q, mode, page }],
    queryFn: () =>
      api.get<Paginated<EventItem>>("/events", {
        upcoming: tab === "Upcoming" ? true : undefined,
        q: q || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const filtered = (events.data?.items ?? []).filter((e) => {
    if (mode === "online" && !e.isOnline) return false;
    if (mode === "offline" && e.isOnline) return false;
    return true;
  });

  const pagination = events.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const rsvp = useMutation({
    mutationFn: (id: string) => api.post(`/events/${id}/rsvp`, { status: "GOING" }),
    onSuccess: () => {
      toast({ title: "RSVP confirmed", description: "You're registered." });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => toast({ title: "RSVP failed", description: err?.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Discover and register for upcoming alumni events</p>
        </div>
        {isAdmin && <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={() => { qc.invalidateQueries({ queryKey: ["events"] }); setPage(1); }} />}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={mode} onValueChange={(v) => { setMode(v as typeof mode); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {events.isLoading && <LoadingGrid />}
      {!events.isLoading && filtered.length === 0 && (
        <EmptyState icon={CalendarOff} title="No events found" description="Try adjusting filters or check back later." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((event) => (
          <Link
            key={event.id}
            to={`/dashboard/events/${event.id}`}
            className="card-elevated overflow-hidden group block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg"
          >
            <div className="hero-gradient h-2" />
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                    {event.isOnline ? "Online" : "Offline"}
                  </span>
                  {event.attachmentKey && (
                    <Paperclip className="h-3 w-3 text-muted-foreground" title="Has attachment" />
                  )}
                </div>
              </div>
              {event.department && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{event.department}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalIcon className="h-3 w-3" /> {new Date(event.startsAt).toLocaleString()}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {event._count?.rsvps ?? 0} going
                  {event.capacity ? ` / ${event.capacity}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-end pt-2">
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={rsvp.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    rsvp.mutate(event.id);
                  }}
                >
                  {rsvp.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Register"}
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {pagination?.total ? ` (${pagination.total} events)` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

/** Inline create-event dialog — keeps this page self-contained. */
const CreateEventDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    isOnline: false,
    meetingUrl: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    department: "All",
    attachmentKey: "",
  });
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);

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

  const create = useMutation({
    mutationFn: async () => {
      let attachmentKey = form.attachmentKey;
      if (attachFile) {
        attachmentKey = await uploadAttachment(attachFile);
      }
      return api.post("/events", {
        ...form,
        attachmentKey: attachmentKey || undefined,
        department: form.department === "All" ? undefined : form.department,
        meetingUrl: form.isOnline ? form.meetingUrl : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Event created", description: "Notifications will be sent to alumni." });
      onOpenChange(false);
      onCreated();
      setForm({ title: "", description: "", location: "", isOnline: false, meetingUrl: "", startsAt: "", endsAt: "", capacity: "", department: "All", attachmentKey: "" });
      setAttachFile(null);
    },
    onError: (err: any) => toast({ title: "Could not create event", description: err?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Event</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm({ ...form, isOnline: e.target.checked })} />
            This is an online event
          </label>
          {form.isOnline && (
            <div className="space-y-1.5">
              <Label>Meeting URL</Label>
              <Input
                type="url"
                required
                placeholder="https://meet.google.com/..."
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
              />
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
                onClick={() => document.getElementById('event-attach-input')?.click()}
                disabled={attachUploading}
              >
                {attachUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                {attachFile ? attachFile.name : "Choose file"}
              </Button>
              {attachFile && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setAttachFile(null)}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              id="event-attach-input"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttachFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || attachUploading}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Notify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventsPage;
