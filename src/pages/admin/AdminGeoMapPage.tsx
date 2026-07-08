import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Building2, Users, Globe, ChevronDown, ChevronRight, Search, Download, ArrowLeftRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

interface CityBreakdown {
  city: string;
  totalAlumni: number;
  companies: { company: string; count: number }[];
}

type GroupBy = "city" | "company";
interface GroupNode { key: string; total: number; children: { label: string; count: number }[] }

const downloadText = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};

const AdminGeoMapPage = () => {
  const [groupBy, setGroupBy] = useState<GroupBy>("city");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["geo", "breakdown"],
    queryFn: () => api.get<CityBreakdown[]>("/geo/breakdown"),
  });
  const breakdown = data ?? [];

  // City-grouped (as returned) and the inverted company-grouped view.
  const { cityNodes, companyNodes, grandTotal, totalCompanies } = useMemo(() => {
    const cityNodes: GroupNode[] = breakdown
      .map((c) => ({ key: c.city, total: c.totalAlumni, children: c.companies.map((x) => ({ label: x.company, count: x.count })) }))
      .sort((a, b) => b.total - a.total);

    const companyMap = new Map<string, Map<string, number>>();
    for (const c of breakdown) {
      for (const co of c.companies) {
        if (!companyMap.has(co.company)) companyMap.set(co.company, new Map());
        const inner = companyMap.get(co.company)!;
        inner.set(c.city, (inner.get(c.city) ?? 0) + co.count);
      }
    }
    const companyNodes: GroupNode[] = [...companyMap.entries()]
      .map(([company, cities]) => ({
        key: company,
        total: [...cities.values()].reduce((a, b) => a + b, 0),
        children: [...cities.entries()].map(([city, count]) => ({ label: city, count })).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      cityNodes,
      companyNodes,
      grandTotal: cityNodes.reduce((s, c) => s + c.total, 0),
      totalCompanies: companyMap.size,
    };
  }, [breakdown]);

  const nodes = groupBy === "city" ? cityNodes : companyNodes;
  const filtered = nodes.filter((n) => n.key.toLowerCase().includes(search.toLowerCase()));

  const toggle = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const exportCsv = () => {
    const rows = breakdown.flatMap((c) => c.companies.map((co) => ({ City: c.city, Company: co.company, Alumni: co.count })));
    if (!rows.length) { toast({ title: "Nothing to export" }); return; }
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(","))].join("\n");
    downloadText("geo-distribution.csv", "text/csv", csv);
  };

  const stats = [
    { label: "Locations", value: cityNodes.length, icon: Globe, cls: "bg-primary/10 text-primary" },
    { label: "Companies", value: totalCompanies, icon: Building2, cls: "bg-accent/10 text-accent" },
    { label: "Placed Alumni", value: grandTotal, icon: Users, cls: "bg-emerald-500/10 text-emerald-500" },
  ];

  const childIcon = groupBy === "city" ? Building2 : MapPin;
  const rowIcon = groupBy === "city" ? MapPin : Building2;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Geo Map</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Explore where alumni live and work — drill down by {groupBy === "city" ? "city, then company" : "company, then city"}.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.cls}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-6 w-12" /> : <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${groupBy === "city" ? "cities" : "companies"}...`}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => { setGroupBy((g) => (g === "city" ? "company" : "city")); setExpanded([]); setSearch(""); }}
        >
          <ArrowLeftRight className="h-4 w-4" /> Group by {groupBy === "city" ? "Company" : "City"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : nodes.length === 0 ? (
        <EmptyState icon={MapPin} title="No location data yet" description="Alumni profiles need a city and company set to appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">
              {groupBy === "city" ? "City" : "Company"} Directory
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} {groupBy === "city" ? "locations" : "companies"}</p>
          </div>
          <div className="overflow-y-auto max-h-[600px] divide-y divide-border">
            {filtered.map((node) => {
              const share = grandTotal ? (node.total / grandTotal) * 100 : 0;
              const RowIcon = rowIcon;
              const ChildIcon = childIcon;
              return (
                <div key={node.key}>
                  <button
                    onClick={() => toggle(node.key)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <RowIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm truncate">{node.key}</span>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{node.total.toLocaleString()}</Badge>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{share.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, 2)}%` }} />
                      </div>
                    </div>
                    {expanded.includes(node.key)
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {expanded.includes(node.key) && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 pl-10 space-y-1">
                          {node.children.map((child) => (
                            <div key={child.label} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                                <ChildIcon className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{child.label}</span>
                              </span>
                              <span className="font-semibold text-foreground flex-shrink-0">{child.count}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </motion.div>
  );
};

export default AdminGeoMapPage;
