/**
 * Department-verification bulk approval.
 *
 * Workflow: admin exports a CSV of PENDING users (filtered by registration
 * date and department), sends it to the department office, they fill the
 * "Verified (YES/NO)" column, and the admin imports the file back — YES rows
 * are approved, NO rows are rejected, everything else is reported as skipped.
 */
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/departments";
import { toast } from "@/hooks/use-toast";

interface ExportRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  degree: string;
  graduationYear: number | string;
  linkedinUrl: string;
  registeredOn: string;
}

interface Decision {
  userId?: string;
  email?: string;
  decision: "YES" | "NO";
}

interface ParsedFile {
  fileName: string;
  decisions: Decision[];
  noDecision: number;
}

interface ImportResult {
  total: number;
  approved: number;
  rejected: number;
  skipped: { identifier: string; reason: string }[];
}

const CSV_HEADERS = [
  "User ID", "First Name", "Last Name", "Email", "Department",
  "Degree", "Graduation Year", "LinkedIn", "Registered On", "Verified (YES/NO)",
];

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const errMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const toDecision = (raw: unknown): "YES" | "NO" | null => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "approve", "approved", "1"].includes(v)) return "YES";
  if (["no", "n", "false", "reject", "rejected", "0"].includes(v)) return "NO";
  return null;
};

/** Find the actual header key in a parsed row for a logical column. */
const findKey = (row: Record<string, unknown>, ...needles: string[]) =>
  Object.keys(row).find((k) => needles.some((n) => k.toLowerCase().replace(/[^a-z]/g, "").includes(n)));

const DepartmentVerificationCard = () => {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({ from: "", to: "", department: "all" });
  const [exporting, setExporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { items } = await api.get<{ items: ExportRow[] }>("/admin/approvals/export", {
        from: filters.from || undefined,
        to: filters.to || undefined,
        department: filters.department === "all" ? undefined : filters.department,
      });
      if (!items.length) {
        toast({ title: "Nothing to export", description: "No pending users match these filters." });
        return;
      }
      const lines = [
        CSV_HEADERS.join(","),
        ...items.map((r) =>
          [r.userId, r.firstName, r.lastName, r.email, r.department, r.degree, r.graduationYear, r.linkedinUrl, r.registeredOn, ""]
            .map(csvEscape)
            .join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dept = filters.department === "all" ? "all-departments" : filters.department.replace(/[^\w]+/g, "-");
      a.href = url;
      a.download = `pending-approvals-${dept}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: `${items.length} pending user${items.length > 1 ? "s" : ""} exported.` });
    } catch (e) {
      toast({ title: "Export failed", description: errMessage(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rows.length) throw new Error("The file has no data rows.");

      const idKey = findKey(rows[0], "userid");
      const emailKey = findKey(rows[0], "email");
      if (!idKey && !emailKey) throw new Error('Could not find a "User ID" or "Email" column.');
      const decisionKey = findKey(rows[0], "verified", "decision", "yesno", "approve");
      if (!decisionKey) throw new Error('Could not find the "Verified (YES/NO)" column.');

      const decisions: Decision[] = [];
      let noDecision = 0;
      for (const row of rows) {
        const decision = toDecision(row[decisionKey]);
        if (!decision) {
          noDecision += 1;
          continue;
        }
        const userId = idKey ? String(row[idKey]).trim() : "";
        const email = emailKey ? String(row[emailKey]).trim() : "";
        // The backend expects a UUID userId; fall back to email otherwise.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isUuid && !email) {
          noDecision += 1;
          continue;
        }
        decisions.push({ ...(isUuid ? { userId } : {}), ...(email ? { email } : {}), decision });
      }
      if (!decisions.length) throw new Error("No rows have a YES/NO verdict yet.");
      if (decisions.length > 5000) throw new Error("Too many rows — import at most 5000 decisions per file.");
      setParsed({ fileName: file.name, decisions, noDecision });
    } catch (e) {
      setParsed(null);
      toast({ title: "Could not read file", description: errMessage(e), variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const applyImport = useMutation({
    mutationFn: () => api.post<ImportResult>("/admin/approvals/import", { decisions: parsed!.decisions }),
    onSuccess: (res) => {
      setResult(res);
      setParsed(null);
      toast({
        title: "Decisions applied",
        description: `${res.approved} approved, ${res.rejected} rejected${res.skipped.length ? `, ${res.skipped.length} skipped` : ""}.`,
      });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["analytics", "admin-overview"] });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const yesCount = parsed?.decisions.filter((d) => d.decision === "YES").length ?? 0;
  const noCount = parsed ? parsed.decisions.length - yesCount : 0;

  return (
    <div className="card-elevated p-4 sm:p-5 space-y-3.5">
      <div>
        <h2 className="font-semibold text-foreground">Department Verification (Bulk)</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Export pending users, departments mark the last column YES/NO, import the file back to apply.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <Input type="date" className="h-9 w-[150px] text-sm" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <Input type="date" className="h-9 w-[150px] text-sm" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </label>
        <Select value={filters.department} onValueChange={(department) => setFilters((f) => ({ ...f, department }))}>
          <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={exporting} onClick={exportCsv}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export pending
        </Button>
        <span className="hidden sm:block h-5 w-px bg-border" />
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) parseFile(f);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="outline" className="gap-1.5" disabled={parsing} onClick={() => fileInput.current?.click()}>
          {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          Import verified sheet
        </Button>
      </div>

      {/* Parsed file preview + apply */}
      {parsed && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={parsed.fileName}>{parsed.fileName}</span>
          <span className="inline-flex items-center gap-1 text-xs text-accent"><CheckCircle className="h-3 w-3" /> {yesCount} approve</span>
          <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> {noCount} reject</span>
          {parsed.noDecision > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> {parsed.noDecision} without verdict (ignored)
            </span>
          )}
          <div className="flex gap-1.5 ml-auto">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setParsed(null)}><X className="h-3.5 w-3.5" /></Button>
            <Button size="sm" className="h-7" disabled={applyImport.isPending} onClick={() => applyImport.mutate()}>
              {applyImport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply decisions"}
            </Button>
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs space-y-0.5">
          <p className="text-foreground">
            Applied: <span className="text-accent font-medium">{result.approved} approved</span>,{" "}
            <span className="text-destructive font-medium">{result.rejected} rejected</span>
            {result.skipped.length > 0 && <>, {result.skipped.length} skipped</>}.
          </p>
          {result.skipped.slice(0, 5).map((s, i) => (
            <p key={i} className="text-muted-foreground">• {s.identifier} — {s.reason}</p>
          ))}
          {result.skipped.length > 5 && (
            <p className="text-muted-foreground">…and {result.skipped.length - 5} more skipped rows.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentVerificationCard;
