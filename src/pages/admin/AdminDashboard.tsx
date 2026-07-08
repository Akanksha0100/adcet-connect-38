import { motion } from "framer-motion";
import {
  Users, Briefcase, Calendar, Heart, Clock,
  UserCheck, CalendarPlus, BriefcaseBusiness, UserPlus, Trophy, ShieldCheck, type LucideIcon,
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
type ActivityCategory = "user" | "event" | "job" | "achievement" | "donation" | "moderation";
interface ActivityItem {
  id: string; category: ActivityCategory; title: string; subtitle: string; at: string;
}

const formatINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

const ACTIVITY_META: Record<ActivityCategory, { icon: LucideIcon; cls: string }> = {
  user: { icon: UserPlus, cls: "bg-primary/10 text-primary" },
  event: { icon: Calendar, cls: "bg-accent/10 text-accent" },
  job: { icon: Briefcase, cls: "bg-blue-500/10 text-blue-600" },
  achievement: { icon: Trophy, cls: "bg-amber-500/10 text-amber-600" },
  donation: { icon: Heart, cls: "bg-rose-500/10 text-rose-600" },
  moderation: { icon: ShieldCheck, cls: "bg-emerald-500/10 text-emerald-600" },
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

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
  const activity = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => api.get<{ items: ActivityItem[] }>("/admin/activity", { limit: 6 }),
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
          <div className="space-y-1">
            {activity.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : (activity.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
            ) : (
              activity.data!.items.map((a) => {
                const meta = ACTIVITY_META[a.category];
                const Icon = meta.icon;
                return (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                      {a.subtitle && <p className="text-xs text-muted-foreground truncate">{a.subtitle}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{timeAgo(a.at)}</span>
                  </div>
                );
              })
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
