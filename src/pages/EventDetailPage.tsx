import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Users, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null;
  _count?: { rsvps: number };
}

const EventDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<EventDetail>(`/events/${id}`),
    enabled: !!id,
  });

  const rsvp = useMutation({
    mutationFn: () => api.post(`/events/${id}/rsvp`, { status: "GOING" }),
    onSuccess: () => toast({ title: "RSVP confirmed" }),
    onError: (e: any) => toast({ title: "RSVP failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load event.</div>}
      {event && (
        <div className="card-elevated overflow-hidden">
          <img src="/event-card-banner.svg" alt="" className="w-full h-32 object-cover" />
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <Badge variant="secondary">{event.isOnline ? "Online" : "Offline"}</Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(event.startsAt).toLocaleString()}
                {event.endsAt && ` – ${new Date(event.endsAt).toLocaleString()}`}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {event._count?.rsvps ?? 0} going{event.capacity ? ` / ${event.capacity}` : ""}
              </span>
            </div>

            <div>
              <h2 className="font-semibold text-foreground mb-2">About</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </div>

            {event.isOnline && event.meetingUrl && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Online event</span>
                </div>
                <Button size="sm" asChild>
                  <a href={event.meetingUrl} target="_blank" rel="noreferrer">Join meeting</a>
                </Button>
              </div>
            )}

            {event.createdBy && (
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                Organised by{" "}
                <span className="font-medium text-foreground">
                  {event.createdBy.firstName} {event.createdBy.lastName}
                </span>
              </div>
            )}

            <Button onClick={() => rsvp.mutate()} disabled={rsvp.isPending}>
              {rsvp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register / RSVP"}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EventDetailPage;