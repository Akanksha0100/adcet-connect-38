import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApprovalStatus, type AppRole } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ApprovalStatus;
  roles: { role: AppRole }[];
  profile?: {
    department?: string | null;
    graduationYear?: number | null;
    currentCompany?: string | null;
    city?: string | null;
  } | null;
}

interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const UserApprovalsPage = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", filter, search],
    queryFn: () =>
      api.get<Paginated<AdminUser>>("/admin/users", {
        status: filter === "all" ? undefined : filter,
        q: search || undefined,
        pageSize: 60,
      }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.post(`/admin/users/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      toast({ title: `User ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const users = data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and manage user registration requests.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
            const initials = name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-5 flex flex-col gap-4 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge className={`text-[10px] capitalize ${statusColors[u.status]}`}>
                    {u.status.toLowerCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Batch</p>
                    <p className="text-xs font-semibold text-foreground">
                      {u.profile?.graduationYear ?? "—"}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Dept</p>
                    <p className="text-xs font-semibold text-foreground">
                      {u.profile?.department ?? "—"}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Role</p>
                    <p className="text-xs font-semibold text-foreground">
                      {u.roles[0]?.role ?? "—"}
                    </p>
                  </div>
                </div>

                {u.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: u.id, status: "APPROVED" })}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: u.id, status: "REJECTED" })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default UserApprovalsPage;
