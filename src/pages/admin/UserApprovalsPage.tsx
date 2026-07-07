import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Filter, Users, ChevronLeft, ChevronRight, Mail, ShieldCheck, ShieldX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type ApprovalStatus, type AppRole } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import RejectReasonDialog from "@/components/RejectReasonDialog";

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
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  PENDING: RotateCcw,
  APPROVED: ShieldCheck,
  REJECTED: ShieldX,
};

const UserApprovalsPage = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null);
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", filter, search, page],
    queryFn: () =>
      api.get<Paginated<AdminUser>>("/admin/users", {
        status: filter === "all" ? undefined : filter,
        q: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.post(`/admin/users/${id}/status`, { status, reason }),
    onSuccess: (_d, v) => {
      toast({ title: `User ${v.status.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["analytics", "admin-overview"] });
      setSelectedIds((s) => { const n = new Set(s); n.delete(v.id); return n; });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const bulkStatus = useMutation({
    mutationFn: (input: { userIds: string[]; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.post<{ updated: { id: string }[]; errors: { id: string; error: string }[] }>(
        "/admin/users/bulk-status",
        input,
      ),
    onSuccess: (result) => {
      toast({
        title: `Bulk action complete`,
        description: `${result.updated.length} updated${result.errors.length ? `, ${result.errors.length} failed` : ""}`,
      });
      setSelectedIds(new Set());
      setBulkRejectOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["analytics", "admin-overview"] });
    },
    onError: (e: Error) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: ({ id, subject, body }: { id: string; subject: string; body: string }) =>
      api.post(`/admin/users/${id}/message`, { subject, body }),
    onSuccess: () => {
      toast({ title: "Message sent" });
      setMessageTarget(null);
      setMessageForm({ subject: "", body: "" });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const users = data?.items ?? [];
  const pagination = data?.pagination;
  const allOnPageSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  // Determine what actions are possible on the selected set
  const selectedUsers = users.filter((u) => selectedIds.has(u.id));
  const canApproveSelection = selectedUsers.some((u) => u.status !== "APPROVED");
  const canRejectSelection = selectedUsers.some((u) => u.status !== "REJECTED");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage all users — approve, reject, message, or change status.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v as any); setPage(1); setSelectedIds(new Set()); }}>
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-xl"
        >
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} user{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {canApproveSelection && (
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                disabled={bulkStatus.isPending}
                onClick={() =>
                  bulkStatus.mutate({
                    userIds: Array.from(selectedIds),
                    status: "APPROVED",
                  })
                }
              >
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
            {canRejectSelection && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                disabled={bulkStatus.isPending}
                onClick={() => setBulkRejectOpen(true)}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </motion.div>
      )}

      {/* Select All */}
      {users.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allOnPageSelected}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            Select all on this page ({users.length})
          </label>
        </div>
      )}

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your filters." />
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
            const isSelected = selectedIds.has(u.id);
            const StatusIcon = statusIcons[u.status] ?? RotateCcw;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-elevated p-4 md:p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform ${
                  isSelected ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(u.id)}
                    className="flex-shrink-0"
                  />
                  <Link
                    to={`/admin/users/${u.id}`}
                    className="flex items-center gap-3 group focus:outline-none flex-1 min-w-0"
                    title="View user details"
                  >
                    <Avatar className="h-10 w-10 md:h-11 md:w-11">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:underline">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge className={`text-[10px] capitalize gap-1 ${statusColors[u.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {u.status.toLowerCase()}
                    </Badge>
                  </Link>
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
                    <p className="text-xs font-semibold text-foreground truncate">
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

                {/* Actions — colored only for PENDING users; for approved/rejected
                    the status is already shown as a tag, so status-change actions
                    are de-emphasized to plain outline buttons. */}
                <div className="flex flex-wrap gap-2">
                  {u.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      variant={u.status === "PENDING" ? "default" : "outline"}
                      className={`flex-1 gap-1.5 ${
                        u.status === "PENDING"
                          ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                          : ""
                      }`}
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: u.id, status: "APPROVED" })}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {u.status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant={u.status === "PENDING" ? "destructive" : "outline"}
                      className="flex-1 gap-1.5"
                      disabled={setStatus.isPending}
                      onClick={() => setRejectId(u.id)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setMessageTarget({ id: u.id, name })}
                  >
                    <Mail className="h-3.5 w-3.5" /> Message
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {pagination.page} of {pagination.totalPages}
            {pagination.total != null && ` (${pagination.total} users)`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Reject single user dialog */}
      <RejectReasonDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Reject user"
        description="The user will be notified. They will lose access to the portal."
        pending={setStatus.isPending}
        onConfirm={async (reason) => {
          if (rejectId) await setStatus.mutateAsync({ id: rejectId, status: "REJECTED", reason });
        }}
      />

      {/* Bulk reject dialog */}
      <RejectReasonDialog
        open={bulkRejectOpen}
        onOpenChange={(o) => !o && setBulkRejectOpen(false)}
        title={`Reject ${selectedIds.size} user${selectedIds.size > 1 ? "s" : ""}`}
        description="All selected users will be rejected and notified."
        pending={bulkStatus.isPending}
        onConfirm={async (reason) => {
          await bulkStatus.mutateAsync({
            userIds: Array.from(selectedIds),
            status: "REJECTED",
            reason,
          });
        }}
      />

      {/* Send Message Dialog */}
      <Dialog open={!!messageTarget} onOpenChange={(o) => { if (!o) { setMessageTarget(null); setMessageForm({ subject: "", body: "" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message {messageTarget?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (messageTarget) sendMessage.mutate({ id: messageTarget.id, ...messageForm });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                required
                maxLength={120}
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                placeholder="e.g., Welcome to the portal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                required
                maxLength={2000}
                rows={4}
                value={messageForm.body}
                onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                placeholder="Write your message..."
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setMessageTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={sendMessage.isPending} className="gap-1.5">
                {sendMessage.isPending ? <span className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" /> : <Mail className="h-3.5 w-3.5" />}
                Send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default UserApprovalsPage;
