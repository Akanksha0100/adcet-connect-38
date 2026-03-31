import { motion } from "framer-motion";
import { Heart, TrendingUp, IndianRupee, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const summaryCards = [
  { label: "Total Donations", value: "₹12,45,000", icon: IndianRupee, bg: "bg-accent/10", text: "text-accent" },
  { label: "This Month", value: "₹1,20,000", icon: TrendingUp, bg: "bg-primary/10", text: "text-primary" },
  { label: "Total Donors", value: "342", icon: Heart, bg: "bg-rose-500/10", text: "text-rose-600" },
];

const donations = [
  { id: 1, donor: "Rahul Patil", amount: "₹5,000", category: "Scholarships", date: "Mar 28, 2026" },
  { id: 2, donor: "Priya Sharma", amount: "₹10,000", category: "Infrastructure", date: "Mar 25, 2026" },
  { id: 3, donor: "Amit Desai", amount: "₹2,500", category: "Events", date: "Mar 22, 2026" },
  { id: 4, donor: "Sneha K.", amount: "₹15,000", category: "Emergency Fund", date: "Mar 20, 2026" },
  { id: 5, donor: "Vijay Kumar", amount: "₹7,500", category: "Scholarships", date: "Mar 18, 2026" },
  { id: 6, donor: "Neha Joshi", amount: "₹3,000", category: "Infrastructure", date: "Mar 15, 2026" },
];

const categoryColors: Record<string, string> = {
  Scholarships: "bg-accent/15 text-accent border-0",
  Infrastructure: "bg-primary/15 text-primary border-0",
  Events: "bg-amber-500/15 text-amber-600 border-0",
  "Emergency Fund": "bg-rose-500/15 text-rose-600 border-0",
};

const DonationsAdminPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Donations</h1>
      <p className="text-muted-foreground text-sm mt-1">Track and manage all donation activity.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {summaryCards.map((s) => (
        <div key={s.label} className="stat-card hover:-translate-y-0.5">
          <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
            <s.icon className={`h-5 w-5 ${s.text}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">{s.value}</p>
          <p className="text-sm text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>

    <div className="card-elevated overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Recent Donations</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Donor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donations.map((d) => (
            <TableRow key={d.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-foreground">{d.donor}</TableCell>
              <TableCell className="font-semibold text-foreground">{d.amount}</TableCell>
              <TableCell>
                <Badge className={`text-[10px] ${categoryColors[d.category]}`}>{d.category}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{d.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </motion.div>
);

export default DonationsAdminPage;
