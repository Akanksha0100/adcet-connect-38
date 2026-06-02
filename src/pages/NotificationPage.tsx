/**
 * Single notification view. Marks the notification as read on mount and
 * deep-links into the underlying entity (job/event/user) when the
 * notification carries the relevant id in `data`.
 */
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

const NotificationPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["notification", id],
    queryFn: () => api.get<Notification>(`/notifications/${id}`),
    enabled: !!id,
  });

  const markRead = useMutation({
    mutationFn: () => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (data && !data.readAt) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const dataObj = (data?.data ?? {}) as Record<string, unknown>;
  const deepLink =
    typeof dataObj.jobId === "string"
      ? `/dashboard/jobs/${dataObj.jobId}`
      : typeof dataObj.eventId === "string"
      ? `/dashboard/events/${dataObj.eventId}`
      : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load notification.</div>}
      {data && (
        <div className="card-elevated p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{data.type}</p>
            <h1 className="text-xl font-bold text-foreground mt-1">{data.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(data.createdAt).toLocaleString()}
            </p>
          </div>
          {data.body && (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.body}</p>
          )}
          {deepLink && (
            <div>
              <Button asChild size="sm" variant="outline">
                <Link to={deepLink}>Open related page</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationPage;