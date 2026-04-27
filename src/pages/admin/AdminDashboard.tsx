import { motion } from "framer-motion";
import {
  Users, Briefcase, Calendar, Heart, Clock, ArrowUpRight,
  UserCheck, CalendarPlus, BriefcaseBusiness
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Overview {
  totalUsers: number; totalAlumni: number; totalEvents: number;
  totalJobs: number; totalAchievements: number;
  totalDonationsAmount: number; totalDonationsCount: number;
}
interface AdminOverview {
  pendingUsers: number; pendingEvents: number; pendingJobs: number; pendingAchievements: number;
}
interface AuditEntry {
  id: string; action: string; entity: string; entityId?: string | null;
  metadata?: any; createdAt: string;
}

const formatINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<Overview>("/analytics/overview"),
  });
  const adminOverview = useQuery({
    queryKey: ["analytics", "admin-overview"],
    queryFn: () => api.get<AdminOverview>("/analytics/admin/overview"),
  });
  const audit = useQuery({
    queryKey: ["admin", "audit-log", { pageSize: 8 }],
    queryFn: () =>
      api.get<{ items: AuditEntry[] }>("/admin/audit-log", { pageSize: 8 }),
  });

  const pendingTotal =
    (adminOverview.data?.pendingUsers ?? 0) +
    (adminOverview.data?.pendingEvents ?? 0) +
    (adminOverview.data?.pendingJobs ?? 0) +
    (adminOverview.data?.pendingAchievements ?? 0);

  const stats = [
    { label: "Total Users", value: overview.data?.totalUsers, icon: Users, bg: "bg-primary/10", text: "text-primary" },
    { label: "Pending Requests", value: pendingTotal, icon: Clock, bg: "bg-amber-500/10", text: "text-amber-600" },
    { label: "Events", value: overview.data?.totalEvents, icon: Calendar, bg: "bg-accent/10", text: "text-accent" },
    { label: "Active Jobs", value: overview.data?.totalJobs, icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
    { label: "Donations", value: overview.data ? formatINR(overview.data.totalDonationsAmount) : undefined, icon: Heart, bg: "bg-rose-500/10", text: "text-rose-600" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of platform activity and pending actions.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card group hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
            </div>
            {s.value === undefined ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {audit.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (audit.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No activity yet.
              </p>
            ) : (
              audit.data!.items.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.action} · {a.entity}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">
                    {a.entity.toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button className="w-full justify-start gap-3" variant="outline"
              onClick={() => navigate("/admin/approvals")}>
              <UserCheck className="h-4 w-4 text-accent" />
              Approve Requests
              {pendingTotal > 0 && (
                <Badge className="ml-auto bg-amber-500/15 text-amber-600 border-0 text-[10px]">
                  {pendingTotal}
                </Badge>
              )}
            </Button>
            <Button className="w-full justify-start gap-3" variant="outline"
              onClick={() => navigate("/admin/events")}>
              <CalendarPlus className="h-4 w-4 text-accent" />
              Review Events
            </Button>
            <Button className="w-full justify-start gap-3" variant="outline"
              onClick={() => navigate("/admin/jobs")}>
              <BriefcaseBusiness className="h-4 w-4 text-accent" />
              Review Jobs
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
