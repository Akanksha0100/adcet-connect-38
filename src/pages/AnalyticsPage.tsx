import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Briefcase, Calendar, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const userGrowth = [
  { month: "Sep", users: 9800 }, { month: "Oct", users: 10200 }, { month: "Nov", users: 10800 },
  { month: "Dec", users: 11100 }, { month: "Jan", users: 11800 }, { month: "Feb", users: 12450 },
];

const jobPostings = [
  { month: "Sep", jobs: 45 }, { month: "Oct", jobs: 52 }, { month: "Nov", jobs: 60 },
  { month: "Dec", jobs: 38 }, { month: "Jan", jobs: 72 }, { month: "Feb", jobs: 85 },
];

const departmentDist = [
  { name: "Computer", value: 35 }, { name: "IT", value: 25 }, { name: "E&TC", value: 18 },
  { name: "Mechanical", value: 12 }, { name: "Civil", value: 10 },
];

const COLORS = ["hsl(220, 55%, 50%)", "hsl(162, 72%, 40%)", "hsl(38, 92%, 50%)", "hsl(350, 80%, 55%)", "hsl(260, 50%, 55%)"];

const stats = [
  { label: "Total Users", value: "12,450", icon: Users },
  { label: "Job Posts (Feb)", value: "85", icon: Briefcase },
  { label: "Events (Feb)", value: "8", icon: Calendar },
  { label: "Donations (Feb)", value: "₹1.2L", icon: Heart },
];

const AnalyticsPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Admin dashboard — platform overview</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <s.icon className="h-5 w-5 text-accent mb-2" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">User Growth</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="hsl(162, 72%, 40%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Job Postings */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Job Postings</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={jobPostings}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="jobs" fill="hsl(220, 55%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Alumni by Department</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={departmentDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {departmentDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
