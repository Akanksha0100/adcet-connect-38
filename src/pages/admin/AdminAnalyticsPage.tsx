import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Printer, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

interface Overview {
  totalUsers: number;
  totalAlumni: number;
  totalEvents: number;
  totalJobs: number;
  totalAchievements: number;
  totalDonationsAmount: number;
  totalDonationsCount: number;
}
interface AdminOverview {
  pendingUsers: number;
  pendingEvents: number;
  pendingJobs: number;
  pendingAchievements: number;
}
interface AlumniByYear {
  year: number;
  count: number;
}
interface DeptBreakdown {
  department: string | null;
  count: number;
}
interface AlumniRow {
  userId: string;
  department?: string | null;
  degree?: string | null;
  graduationYear?: number | null;
  city?: string | null;
  country?: string | null;
  currentCompany?: string | null;
  currentRole?: string | null;
  user: { firstName: string; lastName: string; email: string };
  skills?: string[];
}
interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; pageSize: number };
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

const alumniExportRows = (rows: AlumniRow[]) =>
  rows.map((r) => ({
    Name: `${r.user.firstName} ${r.user.lastName}`,
    Email: r.user.email,
    Branch: r.department ?? "",
    Degree: r.degree ?? "",
    Year: r.graduationYear ?? "",
    Company: r.currentCompany ?? "",
    Role: r.currentRole ?? "",
    Location: [r.city, r.country].filter(Boolean).join(", "),
    Skills: r.skills?.join("; ") ?? "",
  }));

const downloadText = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
};

const toExcelHtml = (rows: Record<string, unknown>[]) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const cell = (v: unknown) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return `<table><thead><tr>${headers.map((h) => `<th>${cell(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${cell(r[h])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
};

const printRows = (title: string, rows: Record<string, unknown>[]) => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}</style><h1>${title}</h1>${toExcelHtml(rows)}`);
  win.document.close();
  win.focus();
  win.print();
};

const AdminAnalyticsPage = () => {
  const [filters, setFilters] = useState({
    q: "",
    company: "",
    location: "",
    branch: "",
    graduationYear: "",
    degree: "all",
    skill: "",
  });
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<Overview>("/analytics/overview"),
  });
  const adminOverview = useQuery({
    queryKey: ["analytics", "admin-overview"],
    queryFn: () => api.get<AdminOverview>("/analytics/admin/overview"),
  });
  const byYear = useQuery({
    queryKey: ["analytics", "alumni-by-year"],
    queryFn: () => api.get<AlumniByYear[]>("/analytics/alumni-by-year"),
  });
  const dept = useQuery({
    queryKey: ["analytics", "department-breakdown"],
    queryFn: () => api.get<DeptBreakdown[]>("/analytics/department-breakdown"),
  });
  const alumni = useQuery({
    queryKey: ["analytics", "admin-alumni", filters],
    queryFn: () =>
      api.get<Paginated<AlumniRow>>("/analytics/admin/alumni", {
        q: filters.q || undefined,
        company: filters.company || undefined,
        location: filters.location || undefined,
        branch: filters.branch || undefined,
        graduationYear: filters.graduationYear || undefined,
        degree: filters.degree === "all" ? undefined : filters.degree,
        skill: filters.skill || undefined,
        pageSize: 100,
      }),
  });

  const stats = [
    { label: "Total Users", value: overview.data?.totalUsers },
    { label: "Total Alumni", value: overview.data?.totalAlumni },
    { label: "Approved Events", value: overview.data?.totalEvents },
    { label: "Approved Jobs", value: overview.data?.totalJobs },
    { label: "Pending Users", value: adminOverview.data?.pendingUsers },
    { label: "Pending Events", value: adminOverview.data?.pendingEvents },
    { label: "Pending Jobs", value: adminOverview.data?.pendingJobs },
    { label: "Pending Achievements", value: adminOverview.data?.pendingAchievements },
  ];
  const alumniRows = alumni.data?.items ?? [];
  const exportRows = alumniExportRows(alumniRows);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform insights and trends.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            {s.value === undefined ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-bold text-foreground">{s.value.toLocaleString()}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Alumni by Graduation Year</h2>
          {byYear.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (byYear.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={byYear.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Department Breakdown</h2>
          {dept.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (dept.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dept.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Moderation Pipeline</h2>
          {adminOverview.isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Users", value: adminOverview.data?.pendingUsers ?? 0 },
                    { name: "Events", value: adminOverview.data?.pendingEvents ?? 0 },
                    { name: "Jobs", value: adminOverview.data?.pendingJobs ?? 0 },
                    { name: "Achievements", value: adminOverview.data?.pendingAchievements ?? 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-elevated p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Alumni Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Filter approved alumni by company, location, year, branch, degree, and skill.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadText("alumni-analysis.csv", "text/csv", toCsv(exportRows))}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadText("alumni-analysis.xls", "application/vnd.ms-excel", toExcelHtml(exportRows))}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printRows("Alumni Analysis", exportRows)}>
              <Printer className="h-3.5 w-3.5" /> PDF
            </Button>
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
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumni.isLoading && (
                <TableRow>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              )}
              {!alumni.isLoading && alumniRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No alumni match these filters.</TableCell>
                </TableRow>
              )}
              {alumniRows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{row.user.firstName} {row.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{row.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.department ?? "-"}</TableCell>
                  <TableCell>{row.graduationYear ?? "-"}</TableCell>
                  <TableCell>
                    <div>
                      <p>{row.currentCompany ?? "-"}</p>
                      {row.currentRole && <p className="text-xs text-muted-foreground">{row.currentRole}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{[row.city, row.country].filter(Boolean).join(", ") || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.skills?.slice(0, 4).join(", ") || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {alumniRows.length} of {alumni.data?.pagination.total ?? 0} matching alumni.
        </p>
      </div>
    </motion.div>
  );
};

export default AdminAnalyticsPage;
