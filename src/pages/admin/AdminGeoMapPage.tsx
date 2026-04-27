import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Users, Globe, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

interface CityBreakdown {
  city: string;
  totalAlumni: number;
  companies: { company: string; count: number }[];
}

const colorPool = ["bg-primary", "bg-accent", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-blue-500", "bg-violet-500"];
const colorFor = (i: number) => colorPool[i % colorPool.length];

const AdminGeoMapPage = () => {
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [expandedCities, setExpandedCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["geo", "breakdown"],
    queryFn: () => api.get<CityBreakdown[]>("/geo/breakdown"),
  });

  const cityData = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => b.totalAlumni - a.totalAlumni)
        .map((c, i) => ({ ...c, color: colorFor(i) })),
    [data],
  );

  const totalAlumni = cityData.reduce((s, c) => s + c.totalAlumni, 0);
  const allCompanies = Array.from(
    new Set(cityData.flatMap((c) => c.companies.map((co) => co.company))),
  );
  const totalCompanies = allCompanies.length;
  const totalLocations = cityData.length;

  const toggleCity = (name: string) =>
    setExpandedCities((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const active = cityData.find((c) => c.city === activeCity);
  const filteredCities = cityData.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Geo Map</h1>
        <p className="text-muted-foreground text-sm mt-1">Alumni distribution across cities & companies</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-6 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{totalLocations}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-6 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{totalCompanies}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Companies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-6 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{totalAlumni.toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Alumni</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cities..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : cityData.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No location data yet"
          description="Alumni profiles need a city set to show on the map."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">City Directory</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredCities.length} locations</p>
          </div>
          <div className="overflow-y-auto max-h-[600px] divide-y divide-border">
            {filteredCities.map((city) => (
              <div key={city.city}>
                <button
                  onClick={() => toggleCity(city.city)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${city.color}`} />
                    <span className="font-medium text-foreground text-sm">{city.city}</span>
                    <Badge variant="secondary" className="text-xs">{city.totalAlumni.toLocaleString()}</Badge>
                  </div>
                  {expandedCities.includes(city.city) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedCities.includes(city.city) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-1">
                        {city.companies.map((co) => (
                          <div
                            key={co.company}
                            className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Building2 className="h-3 w-3" /> {co.company}
                            </span>
                            <span className="font-semibold text-foreground">{co.count}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};

export default AdminGeoMapPage;
