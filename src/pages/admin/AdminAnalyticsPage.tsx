import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const userGrowth = [
  { month: "Sep", users: 9800 }, { month: "Oct", users: 10200 }, { month: "Nov", users: 10800 },
  { month: "Dec", users: 11100 }, { month: "Jan", users: 11800 }, { month: "Feb", users: 12450 },
];

const eventParticipation = [
  { month: "Sep", participants: 320 }, { month: "Oct", participants: 450 }, { month: "Nov", participants: 380 },
  { month: "Dec", participants: 520 }, { month: "Jan", participants: 610 }, { month: "Feb", participants: 480 },
];

const donationOverview = [
  { name: "Scholarships", value: 40 }, { name: "Infrastructure", value: 25 },
  { name: "Events", value: 20 }, { name: "Emergency", value: 15 },
];

const COLORS = ["hsl(162, 72%, 40%)", "hsl(220, 55%, 50%)", "hsl(38, 92%, 50%)", "hsl(350, 80%, 55%)"];

const AdminAnalyticsPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform insights and trends.</p>
      </div>
      <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export</Button>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Event Participation</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={eventParticipation}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="participants" fill="hsl(220, 55%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Donations Overview</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={donationOverview} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
              {donationOverview.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </motion.div>
);

export default AdminAnalyticsPage;
