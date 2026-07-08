import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  UserCheck,
  Calendar,
  CalendarCheck,
  Briefcase,
  FileText,
  Trophy,
  IndianRupee,
  TrendingUp,
  Loader2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type Row = Record<string, unknown>;

const PAGE_SIZE = 25;

const APPROVAL_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
const DONATION_STATUSES = [
  { value: "PLEDGED", label: "Pending" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DEPARTMENTS = [
  "CSE",
  "CSE (IoT & Cyber Security)",
  "CSE (AI & Data Science)",
  "Robotics & Automation",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Aeronautical Engineering",
  "Food Technology",
  "E&TC",
];

interface ReportDef {
  value: string;
  label: string;
  description: string;
  group: "People" | "Engagement" | "Finance";
  icon: LucideIcon;
  statuses?: { value: string; label: string }[];
  department?: boolean;
  date?: boolean;
}

const REPORTS: ReportDef[] = [
  { value: "users", label: "All Users", description: "Every account with role, status, department & contact.", group: "People", icon: Users, statuses: APPROVAL_STATUSES, department: true, date: true },
  { value: "alumni", label: "Alumni Directory", description: "Approved alumni with employment & city.", group: "People", icon: GraduationCap, department: true },
  { value: "pending-approvals", label: "Pending Approvals", description: "Accounts awaiting admin verification.", group: "People", icon: UserCheck, date: true },
  { value: "events", label: "Events", description: "Events with organizer, RSVPs & status.", group: "Engagement", icon: Calendar, statuses: APPROVAL_STATUSES, department: true, date: true },
  { value: "event-rsvps", label: "Event RSVPs", description: "Every RSVP with attendee & response.", group: "Engagement", icon: CalendarCheck, date: true },
  { value: "jobs", label: "Jobs", description: "Postings with poster, applications & status.", group: "Engagement", icon: Briefcase, statuses: APPROVAL_STATUSES, department: true, date: true },
  { value: "job-applications", label: "Job Applications", description: "Applicants per job with profile snapshot.", group: "Engagement", icon: FileText, date: true },
  { value: "achievements", label: "Achievements", description: "Submitted achievements with author & category.", group: "Engagement", icon: Trophy, statuses: APPROVAL_STATUSES, date: true },
  { value: "donations", label: "Donations (Detailed)", description: "Each transaction with donor, method & receipt.", group: "Finance", icon: IndianRupee, statuses: DONATION_STATUSES, date: true },
  { value: "donations-summary", label: "Donations (Monthly)", description: "Received donations totalled by month.", group: "Finance", icon: TrendingUp, date: true },
];

const GROUPS: ReportDef["group"][] = ["People", "Engagement", "Finance"];

/* ----------------------------- export helpers ----------------------------- */
const downloadText = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: Row[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};

const toExcelHtml = (rows: Row[]) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const cell = (v: unknown) =>
    String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return `<table border="1"><thead><tr>${headers.map((h) => `<th>${cell(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${cell(r[h])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
};

const printRows = (title: string, subtitle: string, rows: Row[]) => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    `<!doctype html><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{margin:0}p{color:#64748b;font-size:12px;margin:4px 0 16px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#1e3a5f;color:#fff}tr:nth-child(even){background:#f8fafc}</style>` +
      `<h1>${title}</h1><p>${subtitle}</p>${toExcelHtml(rows)}`,
  );
  win.document.close();
  win.focus();
  win.print();
};

/* --------------------------------- page ---------------------------------- */
const ReportsPage = () => {
  const [typeValue, setTypeValue] = useState("users");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");

  const def = REPORTS.find((r) => r.value === typeValue)!;

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin", "report", typeValue, from, to, status, department],
    queryFn: () =>
      api.post<{ rows: Row[]; summary: Record<string, number | string> }>("/admin/reports", {
        type: typeValue,
        format: "json",
        from: from || undefined,
        to: to || undefined,
        status: def.statuses && status !== "all" ? status : undefined,
        department: def.department && department !== "all" ? department : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary ?? {};
  const headers = rows.length ? Object.keys(rows[0]) : [];

  // Client-side pagination of the (already fully-fetched) rows.
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );
  const rangeStart = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, rows.length);

  // Jump back to page 1 whenever the report or its filters change.
  useEffect(() => {
    setPage(1);
  }, [typeValue, from, to, status, department]);

  const selectReport = (value: string) => {
    setTypeValue(value);
    setStatus("all");
    setDepartment("all");
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const fileBase = `${typeValue}-report-${stamp}`;
  const subtitle = `Generated ${new Date().toLocaleString()} · ${rows.length} records`;

  const exportAs = (format: "csv" | "excel" | "json" | "pdf") => {
    if (!rows.length) {
      toast({ title: "Nothing to export", description: "This report has no rows.", variant: "destructive" });
      return;
    }
    if (format === "csv") downloadText(`${fileBase}.csv`, "text/csv", toCsv(rows));
    if (format === "excel") downloadText(`${fileBase}.xls`, "application/vnd.ms-excel", toExcelHtml(rows));
    if (format === "json") downloadText(`${fileBase}.json`, "application/json", JSON.stringify(rows, null, 2));
    if (format === "pdf") printRows(`${def.label} Report`, subtitle, rows);
    if (format !== "pdf") toast({ title: "Report downloaded", description: `${rows.length} records exported.` });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate detailed reports across the platform — preview, filter, and export for administration.
        </p>
      </div>

      {/* Report catalog */}
      <div className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {REPORTS.filter((r) => r.group === group).map((r) => {
                const active = r.value === typeValue;
                return (
                  <button
                    key={r.value}
                    onClick={() => selectReport(r.value)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        <r.icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + export */}
      <div className="card-elevated p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {def.date && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
              </div>
            </>
          )}
          {def.statuses && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {def.statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {def.department && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(from || to || status !== "all" || department !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFrom(""); setTo(""); setStatus("all"); setDepartment("all"); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-sm text-muted-foreground mr-1">
            {isFetching ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
            ) : (
              <><span className="font-semibold text-foreground">{rows.length}</span> records</>
            )}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAs("csv")} disabled={!rows.length}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAs("excel")} disabled={!rows.length}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAs("json")} disabled={!rows.length}>
              <FileJson className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAs("pdf")} disabled={!rows.length}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(summary).map(([label, value]) => (
            <div key={label} className="stat-card">
              <p className="text-xl font-bold text-foreground">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{def.label} — Preview</h2>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {rangeStart}–{rangeEnd} of {rows.length}
            </span>
          )}
        </div>
        {isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-destructive">{(error as Error)?.message ?? "Failed to load report."}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !isFetching && rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {headers.map((h) => (
                      <th key={h} className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/60 hover:bg-muted/30">
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[280px] truncate" title={String(row[h] ?? "")}>
                          {String(row[h] ?? "") || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ReportsPage;
