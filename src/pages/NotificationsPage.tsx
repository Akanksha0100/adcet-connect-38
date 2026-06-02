/**
 * Full-page list of the current user's notifications. Each item links to a
 * dedicated detail page (`/dashboard/notifications/:id`) where it is marked
 * as read on open.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
}
interface Paginated { items: NotificationItem[]; unread: number }

const NotificationsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "page"],
    queryFn: () => api.get<Paginated>("/notifications", { pageSize: 50 }),
  });
  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All updates from events, jobs, applications, and admins.
          </p>
        </div>
        {(data?.unread ?? 0) > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      )}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={Bell} title="No notifications yet" description="You're all caught up." />
      )}

      <div className="divide-y divide-border card-elevated">
        {data?.items.map((n) => (
          <Link
            key={n.id}
            to={`/dashboard/notifications/${n.id}`}
            className={`block p-4 hover:bg-muted/40 transition-colors ${!n.readAt ? "bg-primary/5" : ""}`}
          >
            <div className="flex items-start gap-3">
              {!n.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
};

export default NotificationsPage;