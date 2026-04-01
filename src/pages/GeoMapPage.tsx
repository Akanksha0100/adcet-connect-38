import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Filter, Users, Building2, ChevronDown, ChevronRight, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const cityData = [
  {
    name: "Pune", count: 3200, top: "58%", left: "28%", color: "bg-primary",
    companies: [
      { name: "Infosys", count: 620 },
      { name: "TCS", count: 540 },
      { name: "Persistent Systems", count: 480 },
      { name: "Wipro", count: 390 },
      { name: "Cognizant", count: 310 },
      { name: "Others", count: 860 },
    ],
  },
  {
    name: "Mumbai", count: 2800, top: "52%", left: "22%", color: "bg-accent",
    companies: [
      { name: "Reliance", count: 450 },
      { name: "TCS", count: 520 },
      { name: "JP Morgan", count: 380 },
      { name: "Deloitte", count: 340 },
      { name: "Others", count: 1110 },
    ],
  },
  {
    name: "Bangalore", count: 1900, top: "72%", left: "32%", color: "bg-emerald-500",
    companies: [
      { name: "Google", count: 180 },
      { name: "Microsoft", count: 220 },
      { name: "Amazon", count: 310 },
      { name: "Infosys", count: 440 },
      { name: "Others", count: 750 },
    ],
  },
  {
    name: "Hyderabad", count: 850, top: "62%", left: "35%", color: "bg-amber-500",
    companies: [
      { name: "Microsoft", count: 150 },
      { name: "Amazon", count: 120 },
      { name: "Deloitte", count: 95 },
      { name: "Others", count: 485 },
    ],
  },
  {
    name: "Delhi NCR", count: 720, top: "28%", left: "32%", color: "bg-rose-500",
    companies: [
      { name: "HCL", count: 180 },
      { name: "Wipro", count: 140 },
      { name: "Adobe", count: 90 },
      { name: "Others", count: 310 },
    ],
  },
  {
    name: "USA", count: 1200, top: "35%", left: "72%", color: "bg-blue-500",
    companies: [
      { name: "Google", count: 210 },
      { name: "Microsoft", count: 190 },
      { name: "Amazon", count: 170 },
      { name: "Meta", count: 130 },
      { name: "Others", count: 500 },
    ],
  },
  {
    name: "Europe", count: 450, top: "25%", left: "52%", color: "bg-violet-500",
    companies: [
      { name: "SAP", count: 95 },
      { name: "Siemens", count: 80 },
      { name: "Others", count: 275 },
    ],
  },
];

const allCompanies = [...new Set(cityData.flatMap(c => c.companies.map(co => co.name)))].filter(n => n !== "Others").sort();

const legend = [
  { label: "5000+", color: "bg-primary" },
  { label: "1000–5000", color: "bg-accent" },
  { label: "500–1000", color: "bg-amber-500" },
  { label: "< 500", color: "bg-rose-500" },
];

const GeoMapPage = () => {
  const totalAlumni = cityData.reduce((s, c) => s + c.count, 0);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [expandedCities, setExpandedCities] = useState<string[]>(["Pune"]);

  const toggleCity = (name: string) =>
    setExpandedCities(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const active = cityData.find(c => c.name === activeCity);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alumni Geo Map</h1>
          <p className="text-muted-foreground text-sm mt-1">Company-wise alumni distribution across locations</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" /> City Directory
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Alumni by City & Company</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {cityData.map(city => (
                <div key={city.name} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleCity(city.name)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${city.color}`} />
                      <span className="font-medium text-foreground text-sm">{city.name}</span>
                      <Badge variant="secondary" className="text-xs">{city.count.toLocaleString()}</Badge>
                    </div>
                    {expandedCities.includes(city.name) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {expandedCities.includes(city.name) && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-1.5">
                          {city.companies.map(co => (
                            <div key={co.name} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Building2 className="h-3 w-3" /> {co.name}
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
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            <SelectItem value="2020">2020</SelectItem>
            <SelectItem value="2019">2019</SelectItem>
            <SelectItem value="2018">2018</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="cs">Computer Engineering</SelectItem>
            <SelectItem value="it">Information Technology</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-44"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {allCompanies.map(c => <SelectItem key={c} value={c.toLowerCase().replace(/\s/g, "-")}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {cityData.map(c => <SelectItem key={c.name} value={c.name.toLowerCase()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Map */}
      <div className="card-elevated overflow-hidden">
        <TooltipProvider delayDuration={100}>
          <div className="relative h-[420px] bg-muted/30 border-b border-border overflow-hidden">
            {/* Static map background with styled regions */}
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 30% 55%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 35%, hsl(var(--accent)) 0%, transparent 40%)" }} />
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Markers */}
            {cityData.map(city => (
              <Tooltip key={city.name}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveCity(activeCity === city.name ? null : city.name)}
                    className="absolute z-10 group"
                    style={{ top: city.top, left: city.left, transform: "translate(-50%, -50%)" }}
                  >
                    <span className={`absolute inset-0 rounded-full ${city.color} opacity-20 animate-ping`} style={{ width: 32, height: 32 }} />
                    <span className={`relative flex items-center justify-center w-8 h-8 rounded-full ${city.color} text-white text-[10px] font-bold shadow-lg ring-2 ring-background transition-transform group-hover:scale-125`}>
                      {city.count >= 1000 ? `${(city.count / 1000).toFixed(1)}k` : city.count}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[220px]">
                  <p className="font-semibold text-sm mb-1.5">{city.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{city.count.toLocaleString()} alumni</p>
                  <div className="space-y-1">
                    {city.companies.slice(0, 4).map(co => (
                      <div key={co.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{co.name}</span>
                        <span className="font-medium">{co.count}</span>
                      </div>
                    ))}
                    {city.companies.length > 4 && <p className="text-xs text-muted-foreground">+{city.companies.length - 4} more</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Total stat */}
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-xl p-3 border border-border shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">{totalAlumni.toLocaleString()} Alumni</span>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl p-3 border border-border shadow-sm">
              <p className="text-xs font-medium text-foreground mb-1.5">Density</p>
              <div className="space-y-1">
                {legend.map(l => (
                  <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Active city detail */}
        <AnimatePresence>
          {active && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${active.color}`} /> {active.name}
                    <Badge variant="secondary">{active.count.toLocaleString()} alumni</Badge>
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setActiveCity(null)} className="h-7 w-7"><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {active.companies.map(co => (
                    <div key={co.name} className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{co.name}</p>
                        <p className="text-xs text-muted-foreground">{co.count} alumni</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* City stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cityData.map(city => (
          <button
            key={city.name}
            onClick={() => setActiveCity(activeCity === city.name ? null : city.name)}
            className={`stat-card flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 ${activeCity === city.name ? "ring-2 ring-primary" : ""}`}
          >
            <div className={`w-9 h-9 rounded-lg ${city.color}/10 flex items-center justify-center`}>
              <MapPin className={`h-4 w-4 ${city.color.replace("bg-", "text-")}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{city.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{city.name}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default GeoMapPage;
