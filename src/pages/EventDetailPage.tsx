import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Users, Loader2, Video, Paperclip, Building2, Download } from "lucide-react";
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
  department?: string | null;
  attachmentKey?: string | null;
  coverKey?: string | null;
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

  const downloadAttachment = async () => {
    if (!event?.attachmentKey) return;
    try {
      const { url } = await api.post<{ url: string }>("/uploads/presign-download", { key: event.attachmentKey });
      window.open(url, "_blank");
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const isPast = event ? new Date(event.startsAt) < new Date() : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && <div className="text-sm text-destructive">Failed to load event.</div>}
      {event && (
        <div className="card-elevated overflow-hidden">
          <div className="hero-gradient h-3" />
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{event.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{event.isOnline ? "Online" : "Offline"}</Badge>
                {isPast && <Badge variant="outline" className="text-muted-foreground">Past Event</Badge>}
              </div>
            </div>

            {event.department && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Department:</span>
                <Badge variant="outline" className="text-primary">{event.department}</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="break-all sm:break-normal">
                  {new Date(event.startsAt).toLocaleString()}
                  {event.endsAt && ` – ${new Date(event.endsAt).toLocaleString()}`}
                </span>
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

            {event.attachmentKey && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Event attachment</span>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadAttachment}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            )}

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

            {!isPast && (
              <Button onClick={() => rsvp.mutate()} disabled={rsvp.isPending} className="w-full sm:w-auto">
                {rsvp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register / RSVP"}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EventDetailPage;
