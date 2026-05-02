import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Trash2, CheckCircle2, RotateCcw, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  resolvedAt?: string | null;
  createdAt: string;
}
interface Paginated<T> { items: T[] }

const SupportInboxPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: () => api.get<Paginated<SupportMessage>>("/content/support", { pageSize: 100 }),
  });

  const setResolved = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      api.patch(`/content/support/${id}`, { resolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-inbox"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/content/support/${id}`),
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: ["support-inbox"] });
    },
  });

  const items = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Support Inbox
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Messages submitted via the public Support page.
        </p>
      </div>
      {isLoading ? (
        <LoadingGrid count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="No messages" description="Inbox is empty." />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="card-elevated p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {m.subject || "(no subject)"}
                    </p>
                    {m.resolvedAt ? (
                      <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Resolved</Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Open</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {m.name} · {m.email}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-line">{m.message}</p>
              <div className="flex gap-2">
                {m.resolvedAt ? (
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => setResolved.mutate({ id: m.id, resolved: false })}
                    disabled={setResolved.isPending}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reopen
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5"
                    onClick={() => setResolved.mutate({ id: m.id, resolved: true })}
                    disabled={setResolved.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive"
                  onClick={() => del.mutate(m.id)} disabled={del.isPending}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default SupportInboxPage;