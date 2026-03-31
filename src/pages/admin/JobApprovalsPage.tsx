import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Flag, Search, MapPin, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const jobs = [
  { id: 1, title: "Frontend Developer", company: "TCS", location: "Remote", type: "Full-time", exp: "0-2 yrs", status: "pending" },
  { id: 2, title: "Data Scientist", company: "Infosys", location: "Pune", type: "Full-time", exp: "2-4 yrs", status: "pending" },
  { id: 3, title: "UI/UX Intern", company: "Flipkart", location: "Bangalore", type: "Internship", exp: "Fresher", status: "approved" },
  { id: 4, title: "Backend Engineer", company: "Google", location: "Hyderabad", type: "Full-time", exp: "3-5 yrs", status: "approved" },
  { id: 5, title: "ML Engineer", company: "Amazon", location: "Remote", type: "Contract", exp: "2-4 yrs", status: "pending" },
  { id: 6, title: "DevOps Engineer", company: "Microsoft", location: "Mumbai", type: "Full-time", exp: "1-3 yrs", status: "flagged" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-0",
  approved: "bg-accent/15 text-accent border-0",
  flagged: "bg-destructive/15 text-destructive border-0",
};

const JobApprovalsPage = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expFilter, setExpFilter] = useState("all");

  const filtered = jobs.filter((j) => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    if (expFilter !== "all" && j.exp !== expFilter) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, approve, or flag job postings.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs or companies..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Job Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Internship">Internship</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expFilter} onValueChange={setExpFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Experience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Fresher">Fresher</SelectItem>
            <SelectItem value="0-2 yrs">0-2 yrs</SelectItem>
            <SelectItem value="1-3 yrs">1-3 yrs</SelectItem>
            <SelectItem value="2-4 yrs">2-4 yrs</SelectItem>
            <SelectItem value="3-5 yrs">3-5 yrs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((j) => (
          <motion.div
            key={j.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-5 space-y-3 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">{j.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{j.company}</p>
              </div>
              <Badge className={`text-[10px] capitalize ${statusColors[j.status]}`}>{j.status}</Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{j.type}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{j.exp}</span>
            </div>

            <div className="flex gap-2 pt-1">
              {j.status === "pending" && (
                <>
                  <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="gap-1">
                <Flag className="h-3.5 w-3.5" /> Flag
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default JobApprovalsPage;
