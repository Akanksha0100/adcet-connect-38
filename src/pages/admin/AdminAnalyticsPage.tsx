import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  Download, FileSpreadsheet, Printer, Search, Mail, Image as ImageIcon,
  FileDown, Users, GraduationCap, Calendar, Briefcase, Trophy, IndianRupee, CalendarCheck, UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportElementPng, exportElementsPdf } from "@/lib/exportChart";
import BulkEmailDialog from "@/components/BulkEmailDialog";

/* --------------------------------- types --------------------------------- */
interface LabelValue { label: string; value: number }
interface Trend { month: string; count: number }
interface DonationTrend { month: string; count: number; amount: number }
interface Insights {
  kpis: {
    totalAlumni: number; newRegistrations: number; newUsersApproved: number;
    events: number; totalRsvps: number; jobs: number; openJobs: number;
    achievements: number; donationsReceived: number; donationAmount: number;
  };
  trends: { registrations: Trend[]; events: Trend[]; jobs: Trend[]; achievements: Trend[]; donations: DonationTrend[] };
  distributions: {
    byDepartment: LabelValue[]; byGraduationYear: LabelValue[]; donationStatus: LabelValue[];
    jobStatus: LabelValue[]; eventStatus: LabelValue[]; topCompanies: LabelValue[]; topCities: LabelValue[];
  };
}
interface AlumniRow {
  userId: string; department?: string | null; degree?: string | null; graduationYear?: number | null;
  city?: string | null; country?: string | null; currentCompany?: string | null; currentRole?: string | null;
  user: { firstName: string; lastName: string; email: string }; skills?: string[];
}
interface Paginated<T> { items: T[]; pagination: { total: number; page: number; pageSize: number } }

const DEPARTMENTS = [
  "CSE", "CSE (IoT & Cyber Security)", "CSE (AI & Data Science)", "Robotics & Automation",
  "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Aeronautical Engineering",
  "Food Technology", "E&TC",
];
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#e67e22", "#8e44ad", "#16a085", "#c0392b", "#2980b9"];

/* --------------------------- alumni export helpers ------------------------ */
const alumniExportRows = (rows: AlumniRow[]) =>
  rows.map((r) => ({
    Name: `${r.user.firstName} ${r.user.lastName}`, Email: r.user.email, Branch: r.department ?? "",
    Degree: r.degree ?? "", Year: r.graduationYear ?? "", Company: r.currentCompany ?? "",
    Role: r.currentRole ?? "", Location: [r.city, r.country].filter(Boolean).join(", "), Skills: r.skills?.join("; ") ?? "",
  }));
const downloadText = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
};
const toExcelHtml = (rows: Record<string, unknown>[]) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const cell = (v: unknown) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return `<table><thead><tr>${headers.map((h) => `<th>${cell(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${cell(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
};
const printRows = (title: string, rows: Record<string, unknown>[]) => {
  const win = window.open("", "_blank"); if (!win) return;
  win.document.write(`<!doctype html><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}</style><h1>${title}</h1>${toExcelHtml(rows)}`);
  win.document.close(); win.focus(); win.print();
};

const fmtMonth = (m: string) => {
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1).toLocaleString("en", { month: "short", year: "2-digit" });
};
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/* -------------------------------- chart card ------------------------------ */
const ChartCard = ({
  chartRef, title, subtitle, onExport, className, children,
}: {
  chartRef: (el: HTMLDivElement | null) => void;
  title: string; subtitle?: string; onExport: () => void; className?: string; children: React.ReactNode;
}) => (
  <div ref={chartRef} className={`card-elevated p-5 ${className ?? ""}`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        data-html2canvas-ignore="true"
        onClick={onExport}
        title="Download as PNG"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
    </div>
    {children}
  </div>
);

const EmptyChart = () => <p className="text-sm text-muted-foreground text-center py-16">No data for the selected filters.</p>;

/* ---------------------------------- page ---------------------------------- */
const AdminAnalyticsPage = () => {
  const [range, setRange] = useState({ from: "", to: "", department: "all" });
  const [filters, setFilters] = useState({ q: "", company: "", location: "", branch: "", graduationYear: "", degree: "all", skill: "" });
  const [mailOpen, setMailOpen] = useState(false);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setRef = (id: string) => (el: HTMLDivElement | null) => { chartRefs.current[id] = el; };

  const insights = useQuery({
    queryKey: ["analytics", "insights", range],
    queryFn: () => api.get<Insights>("/analytics/admin/insights", {
      from: range.from || undefined,
      to: range.to || undefined,
      department: range.department === "all" ? undefined : range.department,
    }),
    placeholderData: (p) => p,
  });

  const alumni = useQuery({
    queryKey: ["analytics", "admin-alumni", filters],
    queryFn: () => api.get<Paginated<AlumniRow>>("/analytics/admin/alumni", {
      q: filters.q || undefined, company: filters.company || undefined, location: filters.location || undefined,
      branch: filters.branch || undefined, graduationYear: filters.graduationYear || undefined,
      degree: filters.degree === "all" ? undefined : filters.degree, skill: filters.skill || undefined, pageSize: 100,
    }),
  });

  const k = insights.data?.kpis;
  const t = insights.data?.trends;
  const d = insights.data?.distributions;

  const activity = useMemo(() => {
    if (!t) return [];
    const months = new Set<string>();
    [t.events, t.jobs, t.achievements].forEach((s) => s.forEach((p) => months.add(p.month)));
    return [...months].sort().map((m) => ({
      month: m,
      Events: t.events.find((p) => p.month === m)?.count ?? 0,
      Jobs: t.jobs.find((p) => p.month === m)?.count ?? 0,
      Achievements: t.achievements.find((p) => p.month === m)?.count ?? 0,
    }));
  }, [t]);

  const kpis = [
    { label: "Total Alumni", value: k?.totalAlumni, icon: GraduationCap },
    { label: "New Registrations", value: k?.newRegistrations, icon: UserPlus },
    { label: "Events", value: k?.events, icon: Calendar },
    { label: "Event RSVPs", value: k?.totalRsvps, icon: CalendarCheck },
    { label: "Jobs", value: k?.jobs, icon: Briefcase },
    { label: "Achievements", value: k?.achievements, icon: Trophy },
    { label: "Donations", value: k?.donationsReceived, icon: Users },
    { label: "Donation Amount", value: k?.donationAmount, icon: IndianRupee, money: true },
  ];

  const alumniRows = alumni.data?.items ?? [];
  const exportRows = alumniExportRows(alumniRows);
  const recipientCount = alumni.data?.pagination.total ?? 0;

  const exportPng = (id: string, name: string) => {
    const el = chartRefs.current[id];
    if (el) exportElementPng(el, name);
  };
  const exportDashboardPdf = () => {
    const order = ["registrations", "activity", "donations", "byDepartment", "byYear", "donationStatus", "jobStatus", "eventStatus", "topCompanies", "topCities"];
    const els = order.map((id) => chartRefs.current[id]).filter((e): e is HTMLDivElement => !!e);
    exportElementsPdf(els, "adcet-analytics.pdf", "ADCET Alumni — Analytics Dashboard");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform insights, trends, and distributions.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportDashboardPdf}>
          <FileDown className="h-3.5 w-3.5" /> Export dashboard (PDF)
        </Button>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" className="w-40" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" className="w-40" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Department</Label>
          <Select value={range.department} onValueChange={(v) => setRange((r) => ({ ...r, department: v }))}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((dep) => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(range.from || range.to || range.department !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => setRange({ from: "", to: "", department: "all" })}>Clear</Button>
        )}
        <p className="text-xs text-muted-foreground ml-auto self-center">
          Date/department filters apply to the KPIs and charts below.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4 text-primary" />
              {s.value === undefined ? <Skeleton className="h-6 w-16" /> : (
                <p className="text-xl font-bold text-foreground">{s.money ? inr(s.value) : s.value.toLocaleString("en-IN")}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {insights.isLoading && !insights.data ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrations trend */}
          <ChartCard chartRef={setRef("registrations")} title="New Registrations" subtitle="Sign-ups per month" onExport={() => exportPng("registrations", "registrations")}>
            {(t?.registrations.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={t?.registrations}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={fmtMonth} />
                  <Area type="monotone" dataKey="count" name="Registrations" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#regGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Activity trend */}
          <ChartCard chartRef={setRef("activity")} title="Activity Over Time" subtitle="Events, jobs & achievements per month" onExport={() => exportPng("activity", "activity")}>
            {activity.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={fmtMonth} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Events" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Jobs" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Achievements" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Donations trend */}
          <ChartCard chartRef={setRef("donations")} title="Donations Received" subtitle="Amount collected per month" onExport={() => exportPng("donations", "donations")}>
            {(t?.donations.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={t?.donations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip labelFormatter={fmtMonth} formatter={(v: number, n) => (n === "amount" ? [inr(v), "Amount"] : [v, n])} />
                  <Bar dataKey="amount" name="Amount" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Department distribution */}
          <ChartCard chartRef={setRef("byDepartment")} title="Alumni by Department" onExport={() => exportPng("byDepartment", "by-department")}>
            {(d?.byDepartment.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d?.byDepartment} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alumni" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Graduation year */}
          <ChartCard chartRef={setRef("byYear")} title="Alumni by Graduation Year" onExport={() => exportPng("byYear", "by-year")}>
            {(d?.byGraduationYear.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d?.byGraduationYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alumni" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Donation status pie */}
          <ChartCard chartRef={setRef("donationStatus")} title="Donation Status" onExport={() => exportPng("donationStatus", "donation-status")}>
            {(d?.donationStatus.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={d?.donationStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {(d?.donationStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Job status pie */}
          <ChartCard chartRef={setRef("jobStatus")} title="Job Status" onExport={() => exportPng("jobStatus", "job-status")}>
            {(d?.jobStatus.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={d?.jobStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {(d?.jobStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Event status pie */}
          <ChartCard chartRef={setRef("eventStatus")} title="Event Status" onExport={() => exportPng("eventStatus", "event-status")}>
            {(d?.eventStatus.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={d?.eventStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {(d?.eventStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top companies */}
          <ChartCard chartRef={setRef("topCompanies")} title="Top Companies" subtitle="Where alumni work" onExport={() => exportPng("topCompanies", "top-companies")}>
            {(d?.topCompanies.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d?.topCompanies} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alumni" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top cities */}
          <ChartCard chartRef={setRef("topCities")} title="Top Cities" subtitle="Where alumni live" onExport={() => exportPng("topCities", "top-cities")}>
            {(d?.topCities.length ?? 0) === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d?.topCities} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alumni" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {/* Alumni analysis + bulk email */}
      <div className="card-elevated p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Alumni Analysis</h2>
            <p className="text-sm text-muted-foreground">Filter alumni, export the list, or email everyone who matches.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" disabled={recipientCount === 0} onClick={() => setMailOpen(true)}>
              <Mail className="h-3.5 w-3.5" /> Send Mail ({recipientCount})
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadText("alumni-analysis.csv", "text/csv", toCsv(exportRows))}><Download className="h-3.5 w-3.5" /> CSV</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadText("alumni-analysis.xls", "application/vnd.ms-excel", toExcelHtml(exportRows))}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printRows("Alumni Analysis", exportRows)}><Printer className="h-3.5 w-3.5" /> PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search alumni" className="pl-9" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <Input placeholder="Company" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
          <Input placeholder="Location" value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))} />
          <Input placeholder="Branch" value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} />
          <Input placeholder="Year" type="number" value={filters.graduationYear} onChange={(e) => setFilters((f) => ({ ...f, graduationYear: e.target.value }))} />
          <Select value={filters.degree} onValueChange={(degree) => setFilters((f) => ({ ...f, degree }))}>
            <SelectTrigger><SelectValue placeholder="Degree" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Degrees</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="ME">ME</SelectItem>
              <SelectItem value="PHD">PHD</SelectItem>
              <SelectItem value="DIPLOMA">Diploma</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Skill" value={filters.skill} onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))} />
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Branch</TableHead><TableHead>Year</TableHead>
                <TableHead>Company</TableHead><TableHead>Location</TableHead><TableHead>Skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumni.isLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
              {!alumni.isLoading && alumniRows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No alumni match these filters.</TableCell></TableRow>
              )}
              {alumniRows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div><p className="font-medium text-foreground">{row.user.firstName} {row.user.lastName}</p><p className="text-xs text-muted-foreground">{row.user.email}</p></div>
                  </TableCell>
                  <TableCell>{row.department ?? "-"}</TableCell>
                  <TableCell>{row.graduationYear ?? "-"}</TableCell>
                  <TableCell><div><p>{row.currentCompany ?? "-"}</p>{row.currentRole && <p className="text-xs text-muted-foreground">{row.currentRole}</p>}</div></TableCell>
                  <TableCell>{[row.city, row.country].filter(Boolean).join(", ") || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.skills?.slice(0, 4).join(", ") || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {alumniRows.length} of {recipientCount} matching alumni.
        </p>
      </div>

      <BulkEmailDialog open={mailOpen} onOpenChange={setMailOpen} filters={filters} recipientCount={recipientCount} />
    </motion.div>
  );
};

export default AdminAnalyticsPage;
