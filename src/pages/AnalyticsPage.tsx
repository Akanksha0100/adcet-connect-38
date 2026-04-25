import { motion } from "framer-motion";
import { Users, Briefcase, Calendar, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Overview {
  totalAlumni?: number; totalEvents?: number; totalJobs?: number; totalDonationsAmount?: number;
}

const AnalyticsPage = () => {
  const o = useQuery({ queryKey: ["analytics", "overview"], queryFn: () => api.get<Overview>("/analytics/overview") });
  const stats = [
    { label: "Total Alumni", value: o.data?.totalAlumni?.toLocaleString(), icon: Users },
    { label: "Active Jobs", value: o.data?.totalJobs?.toLocaleString(), icon: Briefcase },
    { label: "Events", value: o.data?.totalEvents?.toLocaleString(), icon: Calendar },
    { label: "Donations", value: o.data?.totalDonationsAmount ? `₹${o.data.totalDonationsAmount.toLocaleString("en-IN")}` : undefined, icon: Heart },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon className="h-5 w-5 text-accent mb-2" />
            {o.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-bold text-foreground">{s.value ?? "—"}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
