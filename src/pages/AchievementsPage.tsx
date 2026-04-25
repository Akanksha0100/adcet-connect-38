import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user?: { firstName?: string; lastName?: string };
}

const AchievementsPage = () => {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["achievements", "approved"],
    queryFn: () => api.get<{ items: Achievement[] }>("/achievements", { status: "APPROVED", pageSize: 30 }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">Celebrating alumni accomplishments</p>
        </div>
        <CreateAchievementDialog onCreated={() => qc.invalidateQueries({ queryKey: ["achievements"] })} />
      </div>

      {list.isLoading && <LoadingGrid />}
      {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
        <EmptyState icon={Trophy} title="No achievements yet" description="Submit yours to be featured." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((a) => (
          <div key={a.id} className="card-elevated p-5 space-y-3 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : "Alumni"}
                </p>
                {a.occurredOn && <p className="text-xs text-muted-foreground">{new Date(a.occurredOn).toLocaleDateString()}</p>}
              </div>
            </div>
            <h3 className="font-medium text-foreground text-sm">{a.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
            {a.category && <Badge variant="secondary" className="text-xs">{a.category}</Badge>}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const CreateAchievementDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", occurredOn: "" });
  const create = useMutation({
    mutationFn: () => api.post("/achievements", {
      ...form,
      occurredOn: form.occurredOn ? new Date(form.occurredOn).toISOString() : undefined,
    }),
    onSuccess: () => {
      toast({ title: "Submitted", description: "Pending admin approval." });
      setOpen(false); onCreated();
      setForm({ title: "", description: "", category: "", occurredOn: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Academic, Sports..." /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementsPage;
