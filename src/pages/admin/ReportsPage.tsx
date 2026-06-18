import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type ReportType = "users" | "alumni" | "events" | "jobs" | "donations" | "achievements";
type ExportFormat = "csv" | "excel" | "pdf" | "json";

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  { value: "users", label: "Users", description: "All registered accounts and statuses." },
  { value: "alumni", label: "Alumni", description: "Approved alumni profiles + employment." },
  { value: "events", label: "Events", description: "Event submissions and approvals." },
  { value: "jobs", label: "Jobs", description: "Job postings and statuses." },
  { value: "donations", label: "Donations", description: "Recorded donations and amounts." },
  { value: "achievements", label: "Achievements", description: "Submitted alumni achievements." },
];

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
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
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

const ReportsPage = () => {
  const [type, setType] = useState<ReportType>("users");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await api.post<{ rows: Record<string, unknown>[] }>("/admin/reports", {
        type,
        format: "json",
        from: from || undefined,
        to: to || undefined,
      });
      const rows = data.rows ?? [];
      if (format === "csv") downloadText(`${type}-report.csv`, "text/csv", toCsv(rows));
      if (format === "excel") downloadText(`${type}-report.xls`, "application/vnd.ms-excel", toExcelHtml(rows));
      if (format === "json") downloadText(`${type}-report.json`, "application/json", JSON.stringify(rows, null, 2));
      if (format === "pdf") printRows(`${reportTypes.find((r) => r.value === type)?.label ?? type} Report`, rows);
      toast({ title: "Report generated" });
    } catch (e: any) {
      toast({
        title: "Failed to generate report",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export platform data for offline analysis.
        </p>
      </div>

      <div className="card-elevated p-6 space-y-4 max-w-xl">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Report type</label>
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {reportTypes.find((t) => t.value === type)?.description}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Format</label>
          <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="gap-2">
          {format === "excel" ? <FileSpreadsheet className="h-4 w-4" /> : format === "pdf" ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate & download"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reportTypes.map((t) => (
          <div key={t.value} className="card-elevated p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ReportsPage;
