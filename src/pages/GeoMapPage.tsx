import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import AlumniMap from "@/components/public/AlumniMap";
import { alumniMapQuery } from "@/lib/geo";

/**
 * In-portal twin of the public `/alumni-map`. Same aggregated, city-level data
 * — being signed in buys no extra precision, because none is stored. Counts
 * live on the markers; the admin Geo Map is where the breakdowns are.
 */
const GeoMapPage = () => {
  const { data, isLoading } = useQuery(alumniMapQuery(false));

  // Memoised so the identity is stable while loading — the map rebuilds its
  // cluster index whenever this array changes.
  const points = useMemo(() => data?.points ?? [], [data]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Map</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Where ADCET alumni live, grouped by region. Zoom in to break the groups into cities.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : points.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No location data yet"
          description="Alumni profiles need a city set before they appear on the map."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <AlumniMap points={points} campus={data?.campus} className="h-[380px] sm:h-[520px]" />
        </div>
      )}
    </motion.div>
  );
};

export default GeoMapPage;
