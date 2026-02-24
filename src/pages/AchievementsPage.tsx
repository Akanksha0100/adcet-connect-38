import { motion } from "framer-motion";
import { Search, Trophy, Filter, Upload, Star, Award, Medal, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const achievements = [
  { id: 1, name: "Priya Sharma", batch: "2019", title: "Published Research Paper in IEEE", category: "Academic", year: "2025" },
  { id: 2, name: "Rahul Patil", batch: "2018", title: "Founded AI Startup – Raised $2M", category: "Entrepreneurship", year: "2025" },
  { id: 3, name: "Sneha Kulkarni", batch: "2020", title: "Google Summer of Code Scholar", category: "Technical", year: "2024" },
  { id: 4, name: "Amit Joshi", batch: "2017", title: "National Level Cricket Champion", category: "Sports", year: "2024" },
  { id: 5, name: "Kavita More", batch: "2021", title: "Best Research Poster Award", category: "Academic", year: "2025" },
  { id: 6, name: "Suresh Patil", batch: "2016", title: "Patent for IoT Device", category: "Innovation", year: "2025" },
];

const badges = [
  { label: "Rising Star", icon: Star, count: 24 },
  { label: "Sports Champion", icon: Medal, count: 12 },
  { label: "Top Contributor", icon: Target, count: 18 },
  { label: "Consistent Achiever", icon: Award, count: 8 },
];

const AchievementsPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">Celebrating alumni accomplishments</p>
        </div>
        <Button className="flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> Add Achievement
        </Button>
      </div>

      {/* Badge stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map(b => (
          <div key={b.label} className="stat-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <b.icon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{b.count}</p>
              <p className="text-xs text-muted-foreground">{b.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search achievements..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(a => (
          <div key={a.id} className="card-elevated p-5 space-y-3 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">Batch {a.batch}</p>
              </div>
            </div>
            <h3 className="font-medium text-foreground text-sm">{a.title}</h3>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">{a.category}</Badge>
              <span className="text-xs text-muted-foreground">{a.year}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AchievementsPage;
