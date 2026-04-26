import { motion } from "framer-motion";
import { MapPin, Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface CityAgg { city: string; count: number }
interface CityCompanies {
  city: string; totalAlumni: number;
  companies: { company: string; count: number }[];
}

const GeoMapPage = () => {
  const cities = useQuery({ queryKey: ["geo", "cities"], queryFn: () => api.get<CityAgg[]>("/geo/cities") });
  const breakdown = useQuery({ queryKey: ["geo", "breakdown"], queryFn: () => api.get<CityCompanies[]>("/geo/breakdown") });

  const total = cities.data?.reduce((s, c) => s + c.count, 0) ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Geo Map</h1>
        <p className="text-muted-foreground text-sm mt-1">City-wise alumni distribution</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-4 w-4 text-primary" /></div>
          <div>
            {cities.isLoading ? <Skeleton className="h-6 w-16" /> : <p className="text-lg font-bold text-foreground">{total.toLocaleString()}</p>}
            <p className="text-xs text-muted-foreground">Total Alumni</p>
          </div>
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Distribution by City</h2>
        {cities.isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {!cities.isLoading && (cities.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No location data yet.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cities.data?.map((c) => (
            <div key={c.city} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <MapPin className="h-4 w-4 text-accent" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.city}</p>
                <p className="text-xs text-muted-foreground">{c.count.toLocaleString()} alumni</p>
              </div>
              <Badge variant="secondary">{c.count}</Badge>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default GeoMapPage;
