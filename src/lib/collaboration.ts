/**
 * Alumni Collaboration — alumni offer to run something *for* the college
 * (a placement drive, a workshop, more kinds later) and the alumni office
 * approves or rejects the offer.
 *
 * The whole feature is one API resource with a `type` discriminator, so this
 * file is where a kind is *defined*: its label, its icon copy, its form fields
 * and how a request of that kind reads back as detail rows. The member page and
 * the admin page are each written once and driven by `COLLABORATION_KINDS` —
 * adding the next kind means adding an entry here plus a route, never a new
 * page component.
 */
import { api } from "@/lib/api";

export const COLLABORATION_TYPES = ["PLACEMENT", "WORKSHOP"] as const;
export type CollaborationType = (typeof COLLABORATION_TYPES)[number];

export type CollaborationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CollaborationMode = "ON_CAMPUS" | "ONLINE" | "HYBRID";
export type DurationUnit = "HOURS" | "DAYS";

/**
 * One file per request, 10 MB. Mirrors `COLLABORATION_ATTACHMENT_MAX_BYTES` in
 * the backend's `config/constants.ts`. Bytes go browser → storage, so the form
 * is the only place that can enforce this — check before presigning.
 */
export const COLLABORATION_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const COLLABORATION_ATTACHMENT_ACCEPT =
  "application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

export interface CollaborationRequester {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  profile?: {
    department?: string | null;
    graduationYear?: number | null;
    currentCompany?: string | null;
  } | null;
}

export interface CollaborationRequest {
  id: string;
  type: CollaborationType;
  status: CollaborationStatus;
  rejectionReason?: string | null;

  title: string;
  organization?: string | null;
  departments: string[];
  mode?: CollaborationMode | null;
  description?: string | null;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;

  // placement
  candidatesRequired?: number | null;
  jobRole?: string | null;
  packageLpa?: number | null;
  driveDate?: string | null;
  eligibility?: string | null;

  // workshop
  subject?: string | null;
  durationValue?: number | null;
  durationUnit?: DurationUnit | null;
  startDate?: string | null;
  endDate?: string | null;
  expectedParticipants?: number | null;

  reviewedAt?: string | null;
  createdAt: string;
  user?: CollaborationRequester | null;
}

interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

/* ------------------------------ presentation ------------------------------ */

export const MODE_LABEL: Record<CollaborationMode, string> = {
  ON_CAMPUS: "On campus",
  ONLINE: "Online",
  HYBRID: "Hybrid",
};

export const STATUS_STYLES: Record<CollaborationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-0",
  APPROVED: "bg-accent/15 text-accent border-0",
  REJECTED: "bg-destructive/15 text-destructive border-0",
};

/** "10 Sep 2026" — how the alumni office writes dates. */
export const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

/** A kind's identity: URL slug, page copy, and how its requests read back. */
export interface CollaborationKind {
  type: CollaborationType;
  /** URL segment under /dashboard/collaboration and /admin/collaboration. */
  slug: string;
  /** Sidebar / page heading. */
  label: string;
  /** What the member is offering, in one line. */
  tagline: string;
  /** Sub-heading on the member page. */
  intro: string;
  /** Label on the submit button and dialog heading. */
  ctaLabel: string;
  /** Rows shown on a request card and in the admin detail view. */
  detailRows: (r: CollaborationRequest) => { label: string; value: string }[];
}

const durationText = (r: CollaborationRequest) =>
  r.durationValue && r.durationUnit
    ? `${r.durationValue} ${r.durationUnit === "HOURS" ? "hour" : "day"}${r.durationValue === 1 ? "" : "s"}`
    : "";

export const COLLABORATION_KINDS: Record<CollaborationType, CollaborationKind> = {
  PLACEMENT: {
    type: "PLACEMENT",
    slug: "placement",
    label: "Placement",
    tagline: "Take a placement drive at ADCET",
    intro:
      "Hiring for your company? Tell the alumni office what you need and they will get back to you to set the drive up.",
    ctaLabel: "Request a placement drive",
    detailRows: (r) => [
      { label: "Role offered", value: r.jobRole ?? "" },
      { label: "Candidates required", value: r.candidatesRequired ? String(r.candidatesRequired) : "" },
      { label: "Package", value: r.packageLpa != null ? `${r.packageLpa} LPA` : "" },
      { label: "Preferred date", value: formatDate(r.driveDate) },
      { label: "Eligibility", value: r.eligibility ?? "" },
    ],
  },
  WORKSHOP: {
    type: "WORKSHOP",
    slug: "workshop",
    label: "Workshop",
    tagline: "Conduct a workshop at ADCET",
    intro:
      "Share what you do best with current students. Propose a subject and the dates that suit you — the office will take it from there.",
    ctaLabel: "Request a workshop",
    detailRows: (r) => [
      { label: "Subject", value: r.subject ?? "" },
      { label: "Duration", value: durationText(r) },
      {
        label: "Dates",
        value: r.endDate
          ? `${formatDate(r.startDate)} → ${formatDate(r.endDate)}`
          : formatDate(r.startDate),
      },
      {
        label: "Expected participants",
        value: r.expectedParticipants ? String(r.expectedParticipants) : "",
      },
    ],
  },
};

/** The kinds in sidebar order. */
export const COLLABORATION_KIND_LIST: CollaborationKind[] = COLLABORATION_TYPES.map(
  (t) => COLLABORATION_KINDS[t],
);

/** Rows shared by every kind, appended after the kind-specific ones. */
export const commonDetailRows = (r: CollaborationRequest) =>
  [
    { label: "Organisation", value: r.organization ?? "" },
    { label: "Departments", value: r.departments.length ? r.departments.join(", ") : "All departments" },
    { label: "Mode", value: r.mode ? MODE_LABEL[r.mode] : "" },
    { label: "Contact email", value: r.contactEmail ?? "" },
    { label: "Contact phone", value: r.contactPhone ?? "" },
  ].filter((row) => row.value);

/** Kind-specific rows plus the shared ones, blanks dropped. */
export const detailRowsOf = (r: CollaborationRequest) => [
  ...COLLABORATION_KINDS[r.type].detailRows(r).filter((row) => row.value),
  ...commonDetailRows(r),
];

/* --------------------------------- queries -------------------------------- */

/** The caller's own requests of one kind — the "Actions" panel. */
export const myRequestsQuery = (type: CollaborationType) => ({
  queryKey: ["collaboration", "mine", type] as const,
  queryFn: () =>
    api
      .get<Paginated<CollaborationRequest>>("/collaboration", { type, mine: true, pageSize: 50 })
      .then((r) => r.items),
});

/** Every request of one kind at one status — the admin inbox. */
export const adminRequestsQuery = (type: CollaborationType, status: CollaborationStatus, q?: string) => ({
  queryKey: ["collaboration", "admin", type, status, q ?? ""] as const,
  queryFn: () =>
    api
      .get<Paginated<CollaborationRequest>>("/collaboration", {
        type,
        status,
        q: q || undefined,
        pageSize: 50,
      })
      .then((r) => r.items),
});

/* -------------------------------- mutations ------------------------------- */

export type PlacementInput = {
  type: "PLACEMENT";
  candidatesRequired: number;
  packageLpa: number;
  driveDate: string;
  jobRole?: string;
  eligibility?: string;
};

export type WorkshopInput = {
  type: "WORKSHOP";
  subject: string;
  durationValue: number;
  durationUnit: DurationUnit;
  startDate: string;
  endDate?: string;
  expectedParticipants?: number;
};

export type CollaborationInput = (PlacementInput | WorkshopInput) & {
  title: string;
  organization?: string;
  departments: string[];
  mode?: CollaborationMode;
  description?: string;
  attachmentKey?: string;
  attachmentName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export const createRequest = (data: CollaborationInput) =>
  api.post<CollaborationRequest>("/collaboration", data);

export const withdrawRequest = (id: string) => api.delete(`/collaboration/${id}`);

export const moderateRequest = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  api.post<CollaborationRequest>(`/collaboration/${id}/moderate`, { status, reason });
