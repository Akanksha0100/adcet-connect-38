/**
 * Alumni Collaboration — the admin side.
 *
 * The mirror of `CollaborationPage`: same `type` prop, same `COLLABORATION_KINDS`
 * copy, and the request detail comes from the very same `RequestDetails` block
 * the member sees, so the two sides can never drift into showing different
 * versions of one request.
 *
 * Approving is *not* scheduling — it is the office saying "yes, let's talk",
 * after which they contact the alumnus on the details captured in the request.
 * The card leads with those contact details for exactly that reason.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Search, Handshake, Mail, Phone, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import RejectReasonDialog from "@/components/RejectReasonDialog";
import { toast } from "@/hooks/use-toast";
import { RequestDetails } from "@/pages/CollaborationPage";
import {
  COLLABORATION_KINDS,
  STATUS_STYLES,
  adminRequestsQuery,
  detailRowsOf,
  formatDate,
  moderateRequest,
  type CollaborationRequest,
  type CollaborationStatus,
  type CollaborationType,
} from "@/lib/collaboration";

const TABS: { label: string; status: CollaborationStatus }[] = [
  { label: "Pending", status: "PENDING" },
  { label: "Approved", status: "APPROVED" },
  { label: "Rejected", status: "REJECTED" },
];

const requesterName = (r: CollaborationRequest) =>
  `${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""}`.trim() || "Unknown";

const CollaborationAdminPage = ({ type }: { type: CollaborationType }) => {
  const kind = COLLABORATION_KINDS[type];
  const qc = useQueryClient();
  const [status, setStatus] = useState<CollaborationStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [open, setOpen] = useState<CollaborationRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery(adminRequestsQuery(type, status, debounced));

  const moderate = useMutation({
    mutationFn: ({
      id,
      status: next,
      reason,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      reason?: string;
    }) => moderateRequest(id, next, reason),
    onSuccess: (_d, v) => {
      toast({
        title: `Request ${v.status.toLowerCase()}`,
        description: "The alumnus has been notified by email.",
      });
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["collaboration"] });
      qc.invalidateQueries({ queryKey: ["analytics", "admin-overview"] });
    },
    onError: (e: Error) =>
      toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const items = list.data ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-wide">
          Alumni Collaboration
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">{kind.label} requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Alumni offering to {kind.tagline.toLowerCase()}. Approving tells them you are interested —
          reach out on the contact details in the request to fix the specifics.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.status}
              onClick={() => setStatus(t.status)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                status === t.status
                  ? "bg-card text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, company or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {list.isLoading ? (
        <LoadingGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={`No ${status.toLowerCase()} requests`}
          description={`Nothing to review under ${kind.label.toLowerCase()} right now.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="font-semibold text-foreground text-sm text-left hover:underline line-clamp-2"
                  >
                    {r.title}
                  </button>
                  {r.user ? (
                    <Link
                      to={`/admin/users/${r.user.id}`}
                      className="text-xs text-muted-foreground mt-0.5 truncate hover:underline hover:text-foreground block"
                      title="View user details"
                    >
                      {requesterName(r)}
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Unknown</p>
                  )}
                </div>
                <Badge className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[r.status]}`}>
                  {r.status.toLowerCase()}
                </Badge>
              </div>

              {/* The two or three rows that decide whether this is worth opening. */}
              <dl className="space-y-1">
                {detailRowsOf(r)
                  .slice(0, 3)
                  .map((row) => (
                    <div key={row.label} className="flex gap-2 text-xs">
                      <dt className="text-muted-foreground shrink-0">{row.label}:</dt>
                      <dd className="text-foreground truncate">{row.value}</dd>
                    </div>
                  ))}
              </dl>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {r.organization && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Building2 className="h-3 w-3" /> {r.organization}
                  </span>
                )}
                {r.contactEmail && (
                  <a href={`mailto:${r.contactEmail}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Mail className="h-3 w-3" /> Email
                  </a>
                )}
                {r.contactPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.contactPhone}
                  </span>
                )}
              </div>

              {r.status === "REJECTED" && r.rejectionReason && (
                <p className="text-xs rounded-md bg-destructive/10 text-destructive px-2.5 py-2">
                  <span className="font-medium">Reason:</span> {r.rejectionReason}
                </p>
              )}

              <div className="mt-auto pt-1 space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(r)}>
                  View full request
                </Button>
                <Actions
                  request={r}
                  pending={moderate.isPending}
                  onApprove={() => moderate.mutate({ id: r.id, status: "APPROVED" })}
                  onReject={() => setRejectId(r.id)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Sent {formatDate(r.createdAt)}</p>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <span className="truncate">{open.title}</span>
                  <Badge className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[open.status]}`}>
                    {open.status.toLowerCase()}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="text-xs text-muted-foreground">
                From <span className="text-foreground font-medium">{requesterName(open)}</span>
                {open.user?.profile?.department ? ` · ${open.user.profile.department}` : ""}
                {open.user?.email ? ` · ${open.user.email}` : ""}
              </div>

              <RequestDetails request={open} />

              <Actions
                request={open}
                pending={moderate.isPending}
                onApprove={() => moderate.mutate({ id: open.id, status: "APPROVED" })}
                onReject={() => setRejectId(open.id)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <RejectReasonDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title={`Reject ${kind.label.toLowerCase()} request`}
        description="The alumnus is notified with the reason, in the portal and by email."
        pending={moderate.isPending}
        onConfirm={async (reason) => {
          if (rejectId) await moderate.mutateAsync({ id: rejectId, status: "REJECTED", reason });
        }}
      />
    </motion.div>
  );
};

/**
 * A decision is reversible in both directions — the office changes its mind
 * about a date more often than it changes its mind about an alumnus.
 */
const Actions = ({
  request,
  pending,
  onApprove,
  onReject,
}: {
  request: CollaborationRequest;
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) => {
  if (request.status === "PENDING") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
          disabled={pending}
          onClick={onApprove}
        >
          <CheckCircle className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button size="sm" variant="destructive" className="gap-1.5" disabled={pending} onClick={onReject}>
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>
    );
  }
  if (request.status === "APPROVED") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-destructive"
        disabled={pending}
        onClick={onReject}
      >
        <XCircle className="h-3.5 w-3.5" /> Revoke approval
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={pending} onClick={onApprove}>
      <CheckCircle className="h-3.5 w-3.5" /> Approve after all
    </Button>
  );
};

export default CollaborationAdminPage;
