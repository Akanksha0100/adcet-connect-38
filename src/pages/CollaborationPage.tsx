/**
 * Alumni Collaboration — the member side.
 *
 * One component serves every collaboration kind: the `type` prop picks the
 * entry in `COLLABORATION_KINDS` that supplies the copy, and the only
 * kind-specific code here is the block of form fields, chosen by a switch. The
 * layout is deliberately two columns — the form on the left, the **Actions**
 * panel on the right — so a member watches their request move from Pending to
 * Approved on the same screen where they filed it.
 */
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Handshake, Loader2, Upload, X, FileText, Send, Inbox, Trash2, CalendarDays,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import DepartmentMultiSelect from "@/components/DepartmentMultiSelect";
import { toast } from "@/hooks/use-toast";
import { storageUrl } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";
import {
  COLLABORATION_ATTACHMENT_ACCEPT,
  COLLABORATION_ATTACHMENT_MAX_BYTES,
  COLLABORATION_KINDS,
  MODE_LABEL,
  STATUS_STYLES,
  createRequest,
  detailRowsOf,
  formatDate,
  myRequestsQuery,
  withdrawRequest,
  type CollaborationInput,
  type CollaborationRequest,
  type CollaborationType,
} from "@/lib/collaboration";

const EMPTY_COMMON = {
  title: "",
  organization: "",
  mode: "",
  description: "",
  contactEmail: "",
  contactPhone: "",
};

const EMPTY_PLACEMENT = {
  candidatesRequired: "",
  packageLpa: "",
  driveDate: "",
  jobRole: "",
  eligibility: "",
};

const EMPTY_WORKSHOP = {
  subject: "",
  durationValue: "",
  durationUnit: "HOURS",
  startDate: "",
  endDate: "",
  expectedParticipants: "",
};

const EMPTY_FORM = { ...EMPTY_COMMON, ...EMPTY_PLACEMENT, ...EMPTY_WORKSHOP };
type FormState = typeof EMPTY_FORM;

const CollaborationPage = ({ type }: { type: CollaborationType }) => {
  const kind = COLLABORATION_KINDS[type];
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [departments, setDepartments] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<{ key: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<CollaborationRequest | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const mine = useQuery(myRequestsQuery(type));

  const reset = () => {
    setForm(EMPTY_FORM);
    setDepartments([]);
    setAttachment(null);
  };

  const submit = useMutation({
    mutationFn: () => createRequest(buildPayload(type, form, departments, attachment)),
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: "The alumni office will review it and get back to you.",
      });
      reset();
      qc.invalidateQueries({ queryKey: ["collaboration"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawRequest(id),
    onSuccess: () => {
      toast({ title: "Request withdrawn" });
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["collaboration"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not withdraw", description: e.message, variant: "destructive" }),
  });

  const handleFile = async (file: File) => {
    if (file.size > COLLABORATION_ATTACHMENT_MAX_BYTES) {
      toast({
        title: "File too large",
        description: "Attachments are limited to 10 MB.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      setAttachment({ key: await uploadFile(file, "collaboration"), name: file.name });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const requests = mine.data ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-wide">
          Alumni Collaboration
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">{kind.tagline}</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{kind.intro}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ------------------------------ the form ----------------------------- */}
        <form
          className="lg:col-span-2 card-elevated p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div className="flex items-center gap-2 pb-1">
            <Handshake className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">{kind.ctaLabel}</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              minLength={3}
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={
                type === "PLACEMENT" ? "e.g. Infosys campus drive 2026" : "e.g. Hands-on Kubernetes"
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organization">
              Company / institute{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="organization"
              value={form.organization}
              onChange={(e) => set({ organization: e.target.value })}
              placeholder="Who you are representing"
            />
          </div>

          {type === "PLACEMENT" ? (
            <PlacementFields form={form} set={set} />
          ) : (
            <WorkshopFields form={form} set={set} />
          )}

          <DepartmentMultiSelect
            value={departments}
            onChange={setDepartments}
            label="Departments"
            allHint="No selection = open to every department"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mode">Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set({ mode: v })}>
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_LABEL) as (keyof typeof MODE_LABEL)[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set({ contactEmail: e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                value={form.contactPhone}
                onChange={(e) => set({ contactPhone: e.target.value })}
                placeholder="+91…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Anything else the office should know{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={
                type === "PLACEMENT"
                  ? "Selection rounds, bond details, travel arrangements…"
                  : "Prerequisites, lab requirements, software to install…"
              }
            />
          </div>

          {/* One attachment, 10 MB — checked here because the bytes never touch
              the API, they go straight from the browser to storage. */}
          <div className="space-y-1.5">
            <Label>
              Attachment{" "}
              <span className="text-muted-foreground font-normal">
                (optional — one file, up to 10 MB)
              </span>
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept={COLLABORATION_ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {attachment ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate flex-1 text-muted-foreground">{attachment.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive"
                  onClick={() => setAttachment(null)}
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Upload file
              </Button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={reset} disabled={submit.isPending}>
              Clear
            </Button>
            <Button type="submit" className="gap-1.5" disabled={submit.isPending || uploading}>
              {submit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit request
            </Button>
          </div>
        </form>

        {/* ---------------------------- Actions panel --------------------------- */}
        <aside className="card-elevated p-5 space-y-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground text-sm">Actions</h2>
            {requests.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {requests.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Your {kind.label.toLowerCase()} requests and where each one stands.
          </p>

          {mine.isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Nothing yet. Submitted requests show up here with their status.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground line-clamp-1">
                        {r.title}
                      </span>
                      <Badge className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[r.status]}`}>
                        {r.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Sent {formatDate(r.createdAt)}
                    </p>
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <p className="text-[11px] text-destructive mt-1.5 line-clamp-2">
                        {r.rejectionReason}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <RequestDetailDialog
        request={open}
        onOpenChange={(o) => !o && setOpen(null)}
        onWithdraw={(id) => withdraw.mutate(id)}
        withdrawing={withdraw.isPending}
      />
    </motion.div>
  );
};

/* ------------------------------ kind fields ------------------------------- */

type FieldProps = { form: FormState; set: (patch: Partial<FormState>) => void };

const PlacementFields = ({ form, set }: FieldProps) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="candidatesRequired">Candidates required</Label>
        <Input
          id="candidatesRequired"
          type="number"
          min={1}
          required
          value={form.candidatesRequired}
          onChange={(e) => set({ candidatesRequired: e.target.value })}
          placeholder="25"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="packageLpa">Package (LPA)</Label>
        <Input
          id="packageLpa"
          type="number"
          min={0}
          step="0.1"
          required
          value={form.packageLpa}
          onChange={(e) => set({ packageLpa: e.target.value })}
          placeholder="6.5"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="driveDate">Preferred date</Label>
        <Input
          id="driveDate"
          type="date"
          required
          value={form.driveDate}
          onChange={(e) => set({ driveDate: e.target.value })}
        />
      </div>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="jobRole">
        Role offered <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <Input
        id="jobRole"
        value={form.jobRole}
        onChange={(e) => set({ jobRole: e.target.value })}
        placeholder="e.g. Software Engineer Trainee"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="eligibility">
        Eligibility <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <Textarea
        id="eligibility"
        rows={2}
        value={form.eligibility}
        onChange={(e) => set({ eligibility: e.target.value })}
        placeholder="e.g. 6.5 CGPA and above, no live backlogs"
      />
    </div>
  </>
);

const WorkshopFields = ({ form, set }: FieldProps) => (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="subject">Subject</Label>
      <Input
        id="subject"
        required
        minLength={2}
        value={form.subject}
        onChange={(e) => set({ subject: e.target.value })}
        placeholder="e.g. Container orchestration with Kubernetes"
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="durationValue">Duration</Label>
        <Input
          id="durationValue"
          type="number"
          min={1}
          required
          value={form.durationValue}
          onChange={(e) => set({ durationValue: e.target.value })}
          placeholder="2"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="durationUnit">Unit</Label>
        <Select value={form.durationUnit} onValueChange={(v) => set({ durationUnit: v })}>
          <SelectTrigger id="durationUnit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HOURS">Hours</SelectItem>
            <SelectItem value="DAYS">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="expectedParticipants">
          Participants <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="expectedParticipants"
          type="number"
          min={1}
          value={form.expectedParticipants}
          onChange={(e) => set({ expectedParticipants: e.target.value })}
          placeholder="60"
        />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="startDate">From date</Label>
        <Input
          id="startDate"
          type="date"
          required
          value={form.startDate}
          onChange={(e) => set({ startDate: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate">
          To date <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="endDate"
          type="date"
          min={form.startDate || undefined}
          value={form.endDate}
          onChange={(e) => set({ endDate: e.target.value })}
        />
      </div>
    </div>
  </>
);

/* ------------------------------ detail dialog ----------------------------- */

const RequestDetailDialog = ({
  request,
  onOpenChange,
  onWithdraw,
  withdrawing,
}: {
  request: CollaborationRequest | null;
  onOpenChange: (open: boolean) => void;
  onWithdraw: (id: string) => void;
  withdrawing: boolean;
}) => (
  <Dialog open={!!request} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      {request && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <span className="truncate">{request.title}</span>
              <Badge className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[request.status]}`}>
                {request.status.toLowerCase()}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {request.status === "PENDING" && (
            <p className="text-xs text-muted-foreground italic">
              Waiting for the alumni office to review this.
            </p>
          )}
          {request.status === "APPROVED" && (
            <p className="text-xs rounded-md bg-accent/10 text-accent px-2.5 py-2">
              Approved — the alumni office will contact you directly to work out the details.
            </p>
          )}
          {request.status === "REJECTED" && request.rejectionReason && (
            <p className="text-xs rounded-md bg-destructive/10 text-destructive px-2.5 py-2">
              <span className="font-medium">Not approved:</span> {request.rejectionReason}
            </p>
          )}

          <RequestDetails request={request} />

          {request.status === "PENDING" && (
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                disabled={withdrawing}
                onClick={() => onWithdraw(request.id)}
              >
                {withdrawing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Withdraw request
              </Button>
            </div>
          )}
        </>
      )}
    </DialogContent>
  </Dialog>
);

/**
 * The filled-in details of a request, kind-agnostic. Shared with the admin
 * page so a member and an admin never read a different version of the same
 * request.
 */
export const RequestDetails = ({ request }: { request: CollaborationRequest }) => (
  <div className="space-y-3">
    <dl className="divide-y divide-border">
      {detailRowsOf(request).map((row) => (
        <div key={row.label} className="grid grid-cols-3 gap-3 py-2">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="col-span-2 text-sm text-foreground break-words">{row.value}</dd>
        </div>
      ))}
    </dl>

    {request.description && (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Additional details</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{request.description}</p>
      </div>
    )}

    {request.attachmentKey && (
      <a
        href={storageUrl(request.attachmentKey)}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
      >
        <FileText className="h-3.5 w-3.5" />
        {request.attachmentName || "Attachment"}
      </a>
    )}
  </div>
);

/**
 * Form state is all strings (that is what inputs give back); this is the one
 * place that turns them into the typed payload the API's discriminated union
 * expects. Blank optionals are dropped rather than sent as "".
 */
const buildPayload = (
  type: CollaborationType,
  form: FormState,
  departments: string[],
  attachment: { key: string; name: string } | null,
): CollaborationInput => {
  const common = {
    title: form.title.trim(),
    departments,
    organization: form.organization.trim() || undefined,
    mode: (form.mode || undefined) as CollaborationInput["mode"],
    description: form.description.trim() || undefined,
    contactEmail: form.contactEmail.trim() || undefined,
    contactPhone: form.contactPhone.trim() || undefined,
    attachmentKey: attachment?.key,
    attachmentName: attachment?.name,
  };

  if (type === "PLACEMENT") {
    return {
      ...common,
      type: "PLACEMENT",
      candidatesRequired: Number(form.candidatesRequired),
      packageLpa: Number(form.packageLpa),
      driveDate: form.driveDate,
      jobRole: form.jobRole.trim() || undefined,
      eligibility: form.eligibility.trim() || undefined,
    };
  }
  return {
    ...common,
    type: "WORKSHOP",
    subject: form.subject.trim(),
    durationValue: Number(form.durationValue),
    durationUnit: form.durationUnit as "HOURS" | "DAYS",
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    expectedParticipants: form.expectedParticipants
      ? Number(form.expectedParticipants)
      : undefined,
  };
};

export default CollaborationPage;
