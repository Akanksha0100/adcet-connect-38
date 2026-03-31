import { motion } from "framer-motion";
import { CheckCircle, XCircle, Star, Trophy, Award, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const achievements = [
  { id: 1, name: "Priya Sharma", title: "IEEE Research Paper", category: "Academic", status: "pending", icon: "📄" },
  { id: 2, name: "Rahul Patil", title: "Founded EdTech Startup", category: "Entrepreneurship", status: "pending", icon: "🚀" },
  { id: 3, name: "Sneha K.", title: "GSoC 2026 Selection", category: "Technical", status: "approved", icon: "💻" },
  { id: 4, name: "Amit Desai", title: "National Chess Champion", category: "Sports", status: "approved", icon: "♟️" },
  { id: 5, name: "Neha Joshi", title: "Best Paper Award - NeurIPS", category: "Academic", status: "pending", icon: "🏆" },
  { id: 6, name: "Vijay K.", title: "Contributed to Linux Kernel", category: "Open Source", status: "featured", icon: "🐧" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-0",
  approved: "bg-accent/15 text-accent border-0",
  featured: "bg-primary/15 text-primary border-0",
};

const AchievementsAdminPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
      <p className="text-muted-foreground text-sm mt-1">Review and feature alumni achievements.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {achievements.map((a) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated overflow-hidden hover:-translate-y-0.5"
        >
          <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
            {a.icon}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">{a.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{a.name}</p>
              </div>
              <Badge className={`text-[10px] capitalize ${statusColors[a.status]}`}>{a.status}</Badge>
            </div>
            <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
            <div className="flex gap-2 pt-1">
              {a.status === "pending" && (
                <>
                  <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="gap-1.5">
                <Star className="h-3.5 w-3.5" /> Feature
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default AchievementsAdminPage;
