import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import AlumniMap, { MappedCity } from "@/components/public/AlumniMap";
import { api } from "@/lib/api";
import { coordsFor } from "@/lib/city-coords";

interface CityAgg {
  city: string;
  count: number;
}

export default function AlumniMapPage() {
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["geo", "public-cities"],
    // `anonymous` keeps a stale token from triggering a refresh/sign-out here.
    queryFn: () => api.get<CityAgg[]>("/geo/public/cities", undefined, { anonymous: true }),
  });

  const { mapped, unmapped } = useMemo(() => {
    const rows = data ?? [];
    const mapped: MappedCity[] = [];
    const unmapped: CityAgg[] = [];

    for (const r of rows) {
      const coord = coordsFor(r.city);
      if (coord) mapped.push({ ...coord, city: r.city, count: r.count });
      else unmapped.push(r);
    }
    mapped.sort((a, b) => b.count - a.count);

    return { mapped, unmapped };
  }, [data]);

  return (
    <PublicLayout title="Alumni Map">
      <PageHero
        title="Alumni Around the World"
        subtitle="Zoom out to see alumni grouped by region; zoom in to spread them back to their cities."
      />

      <div className="max-w-6xl mx-auto px-6 py-14 space-y-10">
        {/* Map */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? (
            <Skeleton className="w-full h-[420px] sm:h-[560px] rounded-xl" />
          ) : isError ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
              <p className="text-sm text-muted-foreground">
                The alumni map is unavailable right now. Please try again later.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-hidden">
                <AlumniMap cities={mapped} focus={focus} className="h-[420px] sm:h-[560px]" />
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2.5">
                <Info className="h-3.5 w-3.5 mt-px shrink-0" />
                Click the map to enable scroll zoom. Numbers show alumni counts — grouped markers merge nearby
                cities and split apart as you zoom in.
              </p>
            </>
          )}
        </motion.section>

        {/* Cities
        {!isLoading && !isError && mapped.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Where Our Alumni Are</h2>
            <div className="w-14 h-0.5 bg-primary/50 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mapped.map((c) => (
                <button
                  key={c.city}
                  type="button"
                  onClick={() => setFocus({ lat: c.lat, lng: c.lng, nonce: Date.now() })}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card text-left hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{c.city}</span>
                    <span className="block text-xs text-muted-foreground truncate">{c.region}</span>
                  </span>
                  <span className="text-sm font-semibold text-primary tabular-nums">{c.count}</span>
                </button>
              ))}
            </div>

            {unmapped.length > 0 && (
              <p className="text-xs text-muted-foreground mt-5">
                {unmapped.length} {unmapped.length === 1 ? "location is" : "locations are"} not plotted yet:{" "}
                {unmapped.map((u) => u.city).join(", ")}.
              </p>
            )}
          </section>
        )} */}

        {!isLoading && !isError && mapped.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No alumni locations have been published yet. Add your city to your profile and you'll appear here.
            </p>
          </div>
        )}

        {/* CTA */}
        <section className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Put Yourself on the Map</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Join the portal and add your current city so batchmates and juniors can find ADCET alumni near them.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/register">Join the Network</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/about">About the Alumni Cell</Link>
            </Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
