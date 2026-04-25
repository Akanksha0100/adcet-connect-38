import { motion } from "framer-motion";
import { Users, Briefcase, Calendar, Heart, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface AnalyticsOverview {
  totalAlumni?: number;
  totalEvents?: number;
  totalJobs?: number;
  totalDonationsAmount?: number;
  pendingApprovals?: { users: number; events: number; jobs: number; achievements: number };
}

interface EventItem {
  id: string;
  title: string;
  startsAt: string;
  isOnline?: boolean;
  location?: string | null;
}

interface AchievementItem {
  id: string;
  title: string;
  category?: string | null;
  user?: { firstName?: string; lastName?: string };
}

interface Paginated<T> { items: T[]; pagination?: unknown }

const formatINR = (n?: number) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const DashboardHome = () => {
  const { user } = useAuth();

  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<AnalyticsOverview>("/analytics/overview"),
  });

  const events = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: () => api.get<Paginated<EventItem>>("/events", { upcoming: true, pageSize: 5 }),
  });

  const achievements = useQuery({
    queryKey: ["achievements", "recent"],
    queryFn: () =>
      api.get<Paginated<AchievementItem>>("/achievements", { status: "APPROVED", pageSize: 5 }),
  });

  const stats = [
    { label: "Total Alumni", value: overview.data?.totalAlumni?.toLocaleString() ?? "—", icon: Users },
    { label: "Active Jobs", value: overview.data?.totalJobs?.toLocaleString() ?? "—", icon: Briefcase },
    { label: "Events", value: overview.data?.totalEvents?.toLocaleString() ?? "—", icon: Calendar },
    { label: "Donations", value: formatINR(overview.data?.totalDonationsAmount), icon: Heart },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back{user ? `, ${user.firstName}` : ""}! Here's what's happening.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card group cursor-pointer hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            {overview.isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            )}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
            <Link to="/dashboard/events" className="text-sm text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {events.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            {!events.isLoading && (events.data?.items.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming events.</p>
            )}
            {events.data?.items.slice(0, 3).map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.startsAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  {e.isOnline ? "Online" : e.location ?? "Offline"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Featured Achievements</h2>
            <Link to="/dashboard/achievements" className="text-sm text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {achievements.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            {!achievements.isLoading && (achievements.data?.items.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No achievements yet.</p>
            )}
            {achievements.data?.items.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : ""}
                  </p>
                </div>
                {a.category && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {a.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHome;
