/**
 * Events the current user has organised, with a per-event attendees drawer.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarOff, ChevronRight, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface EventRow {
  id: string;
  title: string;
  startsAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isOnline?: boolean;
  _count?: { rsvps: number };
}
interface Paginated<T> { items: T[] }

const MyEventsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["events", "mine"],
    queryFn: () => api.get<Paginated<EventRow>>("/events/mine/posted", { pageSize: 50 }),
  });
  const items = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Events</h1>
        <p className="text-muted-foreground text-sm mt-1">Track RSVPs for events you organised.</p>
      </div>

      {isLoading ? (
        <LoadingGrid count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarOff} title="You haven't organised any events yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((e) => (
            <div key={e.id} className="card-elevated overflow-hidden">
              <img src="/event-card-banner.svg" alt="" className="w-full h-24 object-cover" />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/dashboard/events/${e.id}`} className="font-semibold text-foreground hover:underline">
                    {e.title}
                  </Link>
                  <Badge variant="secondary" className="text-[10px] capitalize">{e.status.toLowerCase()}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.startsAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e._count?.rsvps ?? 0} RSVPs</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-end">
                  <RsvpsSheet eventId={e.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface Rsvp {
  id: string;
  status: "GOING" | "INTERESTED" | "NOT_GOING";
  user: { id: string; firstName: string; lastName: string; email: string };
}

const RsvpsSheet = ({ eventId }: { eventId: string }) => {
  const [open, setOpen] = useState(false);
  const rsvps = useQuery({
    queryKey: ["event-rsvps", eventId],
    queryFn: () => api.get<Rsvp[]>(`/events/${eventId}/rsvps`),
    enabled: open,
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 text-xs">View attendees <ChevronRight className="h-3 w-3" /></Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Attendees</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {rsvps.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {rsvps.data?.length === 0 && <p className="text-sm text-muted-foreground">No RSVPs yet.</p>}
          {rsvps.data?.map((r) => (
            <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 text-sm">
              <div>
                <p className="font-medium text-foreground">{r.user.firstName} {r.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{r.user.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MyEventsPage;