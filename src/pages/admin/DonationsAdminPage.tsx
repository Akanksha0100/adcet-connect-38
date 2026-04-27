import { motion } from "framer-motion";
import { Heart, TrendingUp, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

interface DonationItem {
  id: string;
  amount: number;
  currency: string;
  status: "PLEDGED" | "RECEIVED" | "CANCELLED";
  message?: string | null;
  createdAt: string;
  campaignId?: string | null;
  user: { id: string | null; firstName: string; lastName: string };
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donations"],
    queryFn: () => api.get<Paginated<DonationItem>>("/donations", { pageSize: 100 }),
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
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent Donations</h2>
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
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">
                    {d.user.firstName} {d.user.lastName}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{formatINR(d.amount)}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${statusColors[d.status]}`}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(d.createdAt).toLocaleDateString()}
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
