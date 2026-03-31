import { motion } from "framer-motion";
import {
  Users, Briefcase, Calendar, Heart, Clock, CheckCircle, Plus, ArrowUpRight,
  UserCheck, CalendarPlus, BriefcaseBusiness
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Total Users", value: "12,450", change: "+245", icon: Users, bg: "bg-primary/10", text: "text-primary" },
  { label: "Pending Requests", value: "38", change: "+5", icon: Clock, bg: "bg-amber-500/10", text: "text-amber-600" },
  { label: "Events", value: "24", change: "+3", icon: Calendar, bg: "bg-accent/10", text: "text-accent" },
  { label: "Active Jobs", value: "85", change: "+12", icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
  { label: "Donations", value: "₹8.5L", change: "+₹45K", icon: Heart, bg: "bg-rose-500/10", text: "text-rose-600" },
];

const activityFeed = [
  { text: "Priya Sharma registered as Alumni", time: "2 min ago", type: "user" },
  { text: "New event 'AI Workshop' submitted for approval", time: "15 min ago", type: "event" },
  { text: "Job posting by TCS approved", time: "1 hr ago", type: "job" },
  { text: "₹5,000 donation received from Rahul Patil", time: "2 hrs ago", type: "donation" },
  { text: "Achievement submission by Sneha K. pending review", time: "3 hrs ago", type: "achievement" },
  { text: "User report filed against spam job posting", time: "4 hrs ago", type: "report" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of platform activity and pending actions.</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card group hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
              <span className="text-xs font-medium text-accent flex items-center gap-0.5">
                {s.change} <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <motion.div variants={item} className="lg:col-span-2 card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activityFeed.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">{a.type}</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => navigate("/admin/approvals")}
            >
              <UserCheck className="h-4 w-4 text-accent" />
              Approve Requests
              <Badge className="ml-auto bg-amber-500/15 text-amber-600 border-0 text-[10px]">38</Badge>
            </Button>
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => navigate("/admin/events")}
            >
              <CalendarPlus className="h-4 w-4 text-accent" />
              Add Event
            </Button>
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => navigate("/admin/jobs")}
            >
              <BriefcaseBusiness className="h-4 w-4 text-accent" />
              Post Job
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
