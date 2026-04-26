import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Overview {
  totalUsers: number;
  totalAlumni: number;
  totalEvents: number;
  totalJobs: number;
  totalAchievements: number;
  totalDonationsAmount: number;
  totalDonationsCount: number;
}
interface AdminOverview {
  pendingUsers: number;
  pendingEvents: number;
  pendingJobs: number;
  pendingAchievements: number;
}
interface AlumniByYear {
  year: number;
  count: number;
}
interface DeptBreakdown {
  department: string | null;
  count: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

const AdminAnalyticsPage = () => {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<Overview>("/analytics/overview"),
  });
  const adminOverview = useQuery({
    queryKey: ["analytics", "admin-overview"],
    queryFn: () => api.get<AdminOverview>("/analytics/admin/overview"),
  });
  const byYear = useQuery({
    queryKey: ["analytics", "alumni-by-year"],
    queryFn: () => api.get<AlumniByYear[]>("/analytics/alumni-by-year"),
  });
  const dept = useQuery({
    queryKey: ["analytics", "department-breakdown"],
    queryFn: () => api.get<DeptBreakdown[]>("/analytics/department-breakdown"),
  });

  const stats = [
    { label: "Total Users", value: overview.data?.totalUsers },
    { label: "Total Alumni", value: overview.data?.totalAlumni },
    { label: "Approved Events", value: overview.data?.totalEvents },
    { label: "Approved Jobs", value: overview.data?.totalJobs },
    { label: "Pending Users", value: adminOverview.data?.pendingUsers },
    { label: "Pending Events", value: adminOverview.data?.pendingEvents },
    { label: "Pending Jobs", value: adminOverview.data?.pendingJobs },
    { label: "Pending Achievements", value: adminOverview.data?.pendingAchievements },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform insights and trends.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            {s.value === undefined ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-bold text-foreground">{s.value.toLocaleString()}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Alumni by Graduation Year</h2>
          {byYear.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (byYear.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={byYear.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Department Breakdown</h2>
          {dept.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (dept.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dept.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Moderation Pipeline</h2>
          {adminOverview.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Users", value: adminOverview.data?.pendingUsers ?? 0 },
                    { name: "Events", value: adminOverview.data?.pendingEvents ?? 0 },
                    { name: "Jobs", value: adminOverview.data?.pendingJobs ?? 0 },
                    { name: "Achievements", value: adminOverview.data?.pendingAchievements ?? 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminAnalyticsPage;
