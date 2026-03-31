import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Status = "all" | "pending" | "approved" | "rejected";

const users = [
  { id: 1, name: "Priya Sharma", email: "priya@mail.com", batch: "2022", dept: "Computer", role: "Alumni", status: "pending" as const },
  { id: 2, name: "Rahul Patil", email: "rahul@mail.com", batch: "2021", dept: "IT", role: "Alumni", status: "approved" as const },
  { id: 3, name: "Sneha Kulkarni", email: "sneha@mail.com", batch: "2024", dept: "E&TC", role: "Student", status: "pending" as const },
  { id: 4, name: "Amit Desai", email: "amit@mail.com", batch: "2020", dept: "Mechanical", role: "Alumni", status: "rejected" as const },
  { id: 5, name: "Neha Joshi", email: "neha@mail.com", batch: "2023", dept: "Computer", role: "Student", status: "pending" as const },
  { id: 6, name: "Vijay Kumar", email: "vijay@mail.com", batch: "2019", dept: "Civil", role: "Alumni", status: "approved" as const },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-0",
  approved: "bg-accent/15 text-accent border-0",
  rejected: "bg-destructive/15 text-destructive border-0",
};

const UserApprovalsPage = () => {
  const [filter, setFilter] = useState<Status>("all");
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and manage user registration requests.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((u) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-5 flex flex-col gap-4 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {u.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Badge className={`text-[10px] capitalize ${statusColors[u.status]}`}>{u.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Batch</p>
                <p className="text-xs font-semibold text-foreground">{u.batch}</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Dept</p>
                <p className="text-xs font-semibold text-foreground">{u.dept}</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Role</p>
                <p className="text-xs font-semibold text-foreground">{u.role}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {u.status === "pending" && (
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
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default UserApprovalsPage;
