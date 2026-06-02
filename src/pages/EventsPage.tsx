import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Users, Calendar as CalIcon, Plus, Loader2, CalendarOff } from "lucide-react";
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

interface EventItem {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  isOnline?: boolean;
  startsAt: string;
  endsAt?: string;
  capacity?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  _count?: { rsvps: number };
}

interface Paginated<T> { items: T[]; pagination: { total: number } }

const tabs = ["Upcoming", "Past"] as const;

const EventsPage = () => {
  const [tab, setTab] = useState<typeof tabs[number]>("Upcoming");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "online" | "offline">("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const events = useQuery({
    queryKey: ["events", { tab, q, mode }],
    queryFn: () =>
      api.get<Paginated<EventItem>>("/events", {
        upcoming: tab === "Upcoming" ? true : undefined,
        q: q || undefined,
        pageSize: 30,
      }),
  });

  const filtered = (events.data?.items ?? []).filter((e) => {
    if (mode === "online" && !e.isOnline) return false;
    if (mode === "offline" && e.isOnline) return false;
    return true;
  });

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Discover and register for upcoming alumni events</p>
        </div>
        <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["events"] })} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
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
            onClick={() => setTab(t)}
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
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                </div>
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                  {event.isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/events", {
        ...form,
        meetingUrl: form.isOnline ? form.meetingUrl : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast({ title: "Event submitted", description: "Awaiting admin approval." });
      onOpenChange(false);
      onCreated();
      setForm({ title: "", description: "", location: "", isOnline: false, meetingUrl: "", startsAt: "", endsAt: "", capacity: "" });
    },
    onError: (err: any) => toast({ title: "Could not create event", description: err?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Event</Button>
      </DialogTrigger>
      <DialogContent>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventsPage;
