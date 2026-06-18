import { motion } from "framer-motion";
import { Heart, TrendingUp, IndianRupee, Download, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface DonationItem {
  id: string;
  amount: number;
  currency: string;
  status: "PLEDGED" | "RECEIVED" | "CANCELLED";
  message?: string | null;
  proofKey?: string | null;
  receiptKey?: string | null;
  createdAt: string;
  campaignId?: string | null;
  campaign?: { id: string; title: string } | null;
  user: { id: string | null; firstName: string; lastName: string; email?: string };
  ledgerEntries?: { id: string; entryType: string; status?: string | null; note?: string | null; createdAt: string }[];
}
interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const statusColors: Record<string, string> = {
  RECEIVED: "bg-accent/15 text-accent border-0",
  PLEDGED: "bg-amber-500/15 text-amber-600 border-0",
  CANCELLED: "bg-destructive/15 text-destructive border-0",
};

const DonationsAdminPage = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donations", status],
    queryFn: () => api.get<Paginated<DonationItem>>("/donations", {
      pageSize: 100,
      status: status === "all" ? undefined : status,
    }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: DonationItem["status"] }) =>
      api.patch(`/donations/${id}/status`, { status: nextStatus }),
    onSuccess: () => {
      toast({ title: "Donation updated" });
      qc.invalidateQueries({ queryKey: ["admin", "donations"] });
      qc.invalidateQueries({ queryKey: ["analytics", "overview"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const items = data?.items ?? [];
  const total = items.filter((d) => d.status === "RECEIVED").reduce((s, d) => s + d.amount, 0);
  const monthCutoff = new Date();
  monthCutoff.setDate(1);
  const thisMonth = items
    .filter((d) => d.status === "RECEIVED" && new Date(d.createdAt) >= monthCutoff)
    .reduce((s, d) => s + d.amount, 0);
  const donorCount = new Set(items.filter((d) => d.user.id).map((d) => d.user.id)).size;

  const summaryCards = [
    { label: "Total Received", value: formatINR(total), icon: IndianRupee, bg: "bg-accent/10", text: "text-accent" },
    { label: "This Month", value: formatINR(thisMonth), icon: TrendingUp, bg: "bg-primary/10", text: "text-primary" },
    { label: "Unique Donors", value: donorCount.toString(), icon: Heart, bg: "bg-rose-500/10", text: "text-rose-600" },
  ];

  const download = async (key: string) => {
    try {
      const { url } = await api.post<{ url: string }>("/uploads/presign-download", { key });
      window.open(url, "_blank");
    } catch (e) {
      toast({ title: "Download failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donations</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all donation activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="stat-card hover:-translate-y-0.5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-5 w-5 ${s.text}`} />
            </div>
            {isLoading ? <Skeleton className="h-7 w-24" /> : (
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            )}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Donation Ledger</h2>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PLEDGED">Pledged</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Heart} title="No donations yet" description="Donations will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">
                    <div>
                      <p>{d.user.firstName} {d.user.lastName}</p>
                      {d.user.email && <p className="text-xs text-muted-foreground">{d.user.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{formatINR(d.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.campaign?.title ?? "General"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${statusColors[d.status]}`}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {d.proofKey ? (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => download(d.proofKey!)}>
                          <Download className="h-3 w-3" /> Proof
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {d.receiptKey && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => download(d.receiptKey!)}>
                          <Download className="h-3 w-3" /> Receipt
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {d.status !== "RECEIVED" && (
                        <Button
                          size="sm"
                          className="h-8 gap-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: d.id, nextStatus: "RECEIVED" })}
                        >
                          <CheckCircle className="h-3 w-3" /> Receive
                        </Button>
                      )}
                      {d.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 gap-1"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: d.id, nextStatus: "CANCELLED" })}
                        >
                          <XCircle className="h-3 w-3" /> Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
};

export default DonationsAdminPage;
