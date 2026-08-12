import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, GraduationCap, Briefcase, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import { MultiSelectFilter, ActiveFilterPills } from "@/components/MultiSelectFilter";
import { DEPARTMENTS } from "@/lib/departments";

interface Profile {
  id: string; userId: string;
  city?: string | null; currentCompany?: string | null; currentRole?: string | null;
  department?: string | null; graduationYear?: number | null;
  user?: { firstName?: string; lastName?: string; email?: string };
}

/** Graduation years offered as filters: this year back to the first batch. */
const FIRST_BATCH_YEAR = 2002;
const batchOptions = () => {
  const latest = new Date().getFullYear();
  return Array.from({ length: latest - FIRST_BATCH_YEAR + 1 }, (_, i) => String(latest - i));
};

const AlumniDirectoryPage = () => {
  // Free-text covers names and companies only; department and batch are filters.
  const [q, setQ] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  const batches_ = useMemo(batchOptions, []);
  const activeCount = departments.length + batches.length;

  const list = useQuery({
    queryKey: ["alumni", q, departments, batches],
    queryFn: () =>
      api.get<{ items: Profile[] }>("/alumni", {
        q: q || undefined,
        departments: departments.length ? departments.join(",") : undefined,
        graduationYears: batches.length ? batches.join(",") : undefined,
        pageSize: 30,
      }),
  });

  const initials = (p: Profile) => {
    const f = p.user?.firstName?.[0] ?? ""; const l = p.user?.lastName?.[0] ?? "";
    return (f + l).toUpperCase() || "AL";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Directory</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect with fellow alumni</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or company"
              aria-label="Search alumni by name or company"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <MultiSelectFilter
              emptyLabel="All departments"
              options={DEPARTMENTS}
              value={departments}
              onChange={setDepartments}
              className="flex-1 sm:w-52"
            />
            <MultiSelectFilter
              emptyLabel="All batches"
              options={batches_}
              value={batches}
              onChange={setBatches}
              className="flex-1 sm:w-40"
            />
          </div>
        </div>

        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <ActiveFilterPills value={departments} onChange={setDepartments} />
            <ActiveFilterPills value={batches} onChange={setBatches} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => {
                setDepartments([]);
                setBatches([]);
              }}
            >
              <X className="h-3 w-3" /> Clear filters
            </Button>
          </div>
        )}
      </div>

      {list.isLoading && <LoadingGrid />}
      {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
        <EmptyState
          icon={Users}
          title="No alumni found"
          description={activeCount > 0 || q ? "Try a different name, company or filter." : undefined}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((p) => (
          <div key={p.id} className="card-elevated p-5 flex items-start gap-4 hover:-translate-y-0.5 transition-transform">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(p)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                {`${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim() || "Alumni"}
              </h3>
              {p.currentRole && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Briefcase className="h-3 w-3" /> {p.currentRole}{p.currentCompany ? ` at ${p.currentCompany}` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                {p.graduationYear && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {p.graduationYear} · {p.department ?? ""}</span>}
                {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AlumniDirectoryPage;
