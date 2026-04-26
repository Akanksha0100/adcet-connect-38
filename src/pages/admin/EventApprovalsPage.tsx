import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Calendar, User, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  mode?: string | null;
  startsAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organizer?: { firstName: string; lastName: string } | null;
}

interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const tabs = ["Pending Events", "Approved Events"] as const;

const EventApprovalsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Pending Events");

  const isPending = tab === "Pending Events";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "events", isPending],
    queryFn: () =>
      isPending
        ? api.get<Paginated<EventItem>>("/events/pending", { pageSize: 50 })
        : api.get<Paginated<EventItem>>("/events", { status: "APPROVED", pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.post(`/events/${id}/moderate`, { status }),
    onSuccess: (_d, v) => {
      toast({ title: `Event ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (e: Error) =>
      toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const events = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Event Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve event submissions.
        </p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingGrid count={4} />
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarX} title="No events" description="Nothing to review here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated overflow-hidden hover:-translate-y-0.5"
            >
              <div className="h-28 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-4xl">
                📅
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{e.title}</h3>
                  {e.mode && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {e.mode}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.startsAt).toLocaleDateString()}
                  </span>
                  {e.organizer && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {e.organizer.firstName} {e.organizer.lastName}
                    </span>
                  )}
                </div>
                {e.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: e.id, status: "APPROVED" })}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: e.id, status: "REJECTED" })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default EventApprovalsPage;
