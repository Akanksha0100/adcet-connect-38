import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Eye, Calendar, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const events = [
  { id: 1, name: "AI & ML Workshop", date: "Apr 10, 2026", mode: "Online", organizer: "Dr. Patil", status: "pending", banner: "🤖" },
  { id: 2, name: "Alumni Cricket Match", date: "Apr 15, 2026", mode: "Offline", organizer: "Sports Club", status: "pending", banner: "🏏" },
  { id: 3, name: "Career Fair 2026", date: "May 1, 2026", mode: "Hybrid", organizer: "Placement Cell", status: "approved", banner: "💼" },
  { id: 4, name: "Hackathon 5.0", date: "May 10, 2026", mode: "Offline", organizer: "CS Dept", status: "approved", banner: "💻" },
];

const tabs = ["Pending Events", "Approved Events"] as const;

const EventApprovalsPage = () => {
  const [tab, setTab] = useState<typeof tabs[number]>("Pending Events");

  const filtered = events.filter((e) =>
    tab === "Pending Events" ? e.status === "pending" : e.status === "approved"
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Event Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve event submissions.</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated overflow-hidden hover:-translate-y-0.5"
          >
            <div className="h-28 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-4xl">
              {e.banner}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{e.name}</h3>
                <Badge variant="secondary" className="text-[10px] capitalize">{e.mode}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{e.date}</span>
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{e.organizer}</span>
              </div>
              <div className="flex gap-2 pt-1">
                {e.status === "pending" && (
                  <>
                    <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 gap-1.5">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Details
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default EventApprovalsPage;
