import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign { id: string; title: string; description: string; goalAmount: number; raisedAmount?: number; donorCount?: number; isActive?: boolean }

const presets = [500, 1000, 2000, 5000];

const DonationsPage = () => {
  const qc = useQueryClient();
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => api.get<Campaign[]>("/donations/campaigns") });
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<number | string>(1000);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const myDonations = useQuery({ queryKey: ["donations", "me"], queryFn: () => api.get<{ items?: any[] } | any[]>("/donations/me") });

  const pledge = useMutation({
    mutationFn: () => api.post("/donations", {
      campaignId: selected,
      amount: Number(amount),
      message: message || undefined,
      isAnonymous: anonymous,
    }),
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Donation pledged." });
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast({ title: "Donation failed", description: e?.message, variant: "destructive" }),
  });

  const recent = Array.isArray(myDonations.data) ? myDonations.data : myDonations.data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donations</h1>
        <p className="text-muted-foreground text-sm mt-1">Give back to the ADCET community</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-elevated p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Make a Donation</h2>

          <div className="space-y-2">
            <Label>Campaign</Label>
            {campaigns.isLoading ? <Skeleton className="h-10 w-full" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(campaigns.data ?? []).filter(c => c.isActive !== false).map((c) => (
                  <button
                    key={c.id} type="button" onClick={() => setSelected(c.id)}
                    className={`p-3 text-left rounded-xl border transition-all ${selected === c.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50"}`}
                  >
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                  </button>
                ))}
                {(campaigns.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No active campaigns. You can still donate generally.</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Amount (₹)</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((a) => (
                <button key={a} type="button" onClick={() => setAmount(a)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${Number(amount) === a ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}
                >₹{a.toLocaleString()}</button>
              ))}
            </div>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-xs" />
          </div>

          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Donate anonymously
          </label>

          <Button onClick={() => pledge.mutate()} disabled={pledge.isPending || !amount} className="w-full sm:w-auto px-8">
            {pledge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Heart className="mr-2 h-4 w-4" /> Donate ₹{Number(amount || 0).toLocaleString()}</>}
          </Button>
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">My Recent Donations</h2>
          <div className="space-y-3">
            {myDonations.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            {!myDonations.isLoading && recent.length === 0 && <p className="text-sm text-muted-foreground">No donations yet.</p>}
            {recent.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center"><Heart className="h-4 w-4 text-accent" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">₹{Number(d.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()} · {d.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DonationsPage;
