import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import AlumniMap from "@/components/public/AlumniMap";
import { alumniMapQuery } from "@/lib/geo";

/**
 * The public alumni map — deliberately just the map.
 *
 * The counts a visitor wants are already on the markers themselves, so the page
 * carries no stat tiles, city index or country breakdown; that reporting lives
 * in the admin Geo Map instead.
 */
export default function AlumniMapPage() {
  const { data, isLoading, isError } = useQuery(alumniMapQuery(true));

  // Memoised so the identity is stable while loading — the map rebuilds its
  // cluster index whenever this array changes.
  const points = useMemo(() => data?.points ?? [], [data]);

  return (
    <PublicLayout title="Alumni Map">
      <PageHero
        title="Alumni Around the World"
        subtitle="Zoom out to see alumni grouped by region; zoom in and the groups split apart into cities."
      />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        {isError ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              The alumni map is unavailable right now. Please try again later.
            </p>
          </div>
        ) : isLoading ? (
          <Skeleton className="w-full h-[440px] sm:h-[600px] rounded-xl" />
        ) : points.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No alumni locations have been published yet. Add your city to your profile and you'll
              appear here.
            </p>
          </div>
        ) : (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border overflow-hidden">
              <AlumniMap
                points={points}
                campus={data?.campus}
                className="h-[380px] sm:h-[520px] lg:h-[600px]"
              />
            </div>
          </motion.section>
        )}

        {/* CTA */}
        <section className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Put Yourself on the Map</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Join the portal and add your current city so batchmates and juniors can find ADCET alumni
            near them.
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
