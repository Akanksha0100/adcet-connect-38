import { motion } from "framer-motion";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  { value: "users", label: "Users", description: "All registered accounts and statuses." },
  { value: "alumni", label: "Alumni", description: "Approved alumni profiles + employment." },
  { value: "events", label: "Events", description: "Event submissions and approvals." },
  { value: "jobs", label: "Jobs", description: "Job postings and statuses." },
  { value: "donations", label: "Donations", description: "Recorded donations and amounts." },
  { value: "achievements", label: "Achievements", description: "Submitted alumni achievements." },
];

const ReportsPage = () => {
  const [type, setType] = useState<ReportType>("users");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      if (format === "csv") {
        const csv = await api.post<string>(
          "/admin/reports",
          { type, format: "csv" },
          { raw: true },
        );
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Report downloaded" });
      } else {
        const data = await api.post<{ rows: unknown[] }>("/admin/reports", {
          type,
          format: "json",
        });
        const blob = new Blob([JSON.stringify(data.rows, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Report downloaded" });
      }
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
          <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={generate} disabled={loading} className="gap-2">
          <Download className="h-4 w-4" />
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
