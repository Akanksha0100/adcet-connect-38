import { motion } from "framer-motion";
import { Eye, Trash2, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const reports = [
  { id: 1, type: "Job", title: "Spam job posting - 'Earn 50K daily'", reporter: "Priya S.", date: "Mar 29, 2026", severity: "high" },
  { id: 2, type: "Profile", title: "Fake alumni profile - impersonation", reporter: "Rahul P.", date: "Mar 28, 2026", severity: "high" },
  { id: 3, type: "Event", title: "Misleading event details", reporter: "Sneha K.", date: "Mar 27, 2026", severity: "medium" },
  { id: 4, type: "Job", title: "Duplicate job listing by same recruiter", reporter: "Amit D.", date: "Mar 25, 2026", severity: "low" },
  { id: 5, type: "Profile", title: "Inappropriate profile content", reporter: "Neha J.", date: "Mar 24, 2026", severity: "medium" },
];

const severityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-0",
  medium: "bg-amber-500/15 text-amber-600 border-0",
  low: "bg-muted text-muted-foreground border-0",
};

const typeColors: Record<string, string> = {
  Job: "bg-blue-500/15 text-blue-600 border-0",
  Profile: "bg-primary/15 text-primary border-0",
  Event: "bg-accent/15 text-accent border-0",
};

const ReportsPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-amber-500" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Moderation</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Review flagged content and take action.</p>
      </div>
    </div>

    <div className="space-y-3">
      {reports.map((r) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:-translate-y-0.5"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-[10px] ${typeColors[r.type]}`}>{r.type}</Badge>
              <Badge className={`text-[10px] capitalize ${severityColors[r.severity]}`}>{r.severity}</Badge>
            </div>
            <p className="text-sm font-medium text-foreground">{r.title}</p>
            <p className="text-xs text-muted-foreground">Reported by {r.reporter} · {r.date}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</Button>
            <Button size="sm" variant="destructive" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
            <Button size="sm" variant="secondary" className="gap-1.5"><EyeOff className="h-3.5 w-3.5" /> Ignore</Button>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default ReportsPage;
