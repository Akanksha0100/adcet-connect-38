import { motion } from "framer-motion";
import { Users, Briefcase, Calendar, Heart, Trophy, TrendingUp, ArrowUpRight } from "lucide-react";

const stats = [
  { label: "Total Alumni", value: "12,450", change: "+245", icon: Users, color: "stat-blue" },
  { label: "Active Jobs", value: "328", change: "+18", icon: Briefcase, color: "stat-emerald" },
  { label: "Upcoming Events", value: "12", change: "+3", icon: Calendar, color: "stat-amber" },
  { label: "Donations", value: "₹8.5L", change: "+₹45K", icon: Heart, color: "stat-rose" },
];

const recentAchievements = [
  { name: "Priya Sharma", batch: "2019", title: "Published Research in IEEE", category: "Academic" },
  { name: "Rahul Patil", batch: "2018", title: "Founded AI Startup", category: "Entrepreneurship" },
  { name: "Sneha Kulkarni", batch: "2020", title: "Google Summer of Code", category: "Technical" },
];

const upcomingEvents = [
  { name: "Alumni Meet 2026", date: "Mar 15, 2026", type: "Meetup", mode: "Offline" },
  { name: "Web Dev Workshop", date: "Mar 8, 2026", type: "Workshop", mode: "Online" },
  { name: "Career Fair", date: "Mar 22, 2026", type: "Career", mode: "Hybrid" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const DashboardHome = () => {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, John! Here's what's happening.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card group cursor-pointer hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}`} />
              </div>
              <span className="text-xs font-medium text-accent flex items-center gap-0.5">
                {stat.change} <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <motion.div variants={item} className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
            <button className="text-sm text-accent hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.name} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{event.mode}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Featured Achievements */}
        <motion.div variants={item} className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Featured Achievements</h2>
            <button className="text-sm text-accent hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {recentAchievements.map((a) => (
              <div key={a.name} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.name} · Batch {a.batch}</p>
                </div>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{a.category}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardHome;
