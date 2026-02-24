import { motion } from "framer-motion";
import { MapPin, Filter, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const cities = [
  { name: "Pune", count: 3200, lat: "18.52°N", lng: "73.86°E" },
  { name: "Mumbai", count: 2800, lat: "19.08°N", lng: "72.88°E" },
  { name: "Bangalore", count: 1900, lat: "12.97°N", lng: "77.59°E" },
  { name: "Hyderabad", count: 850, lat: "17.39°N", lng: "78.49°E" },
  { name: "Delhi NCR", count: 720, lat: "28.61°N", lng: "77.21°E" },
  { name: "USA", count: 1200, lat: "37.09°N", lng: "95.71°W" },
  { name: "Europe", count: 450, lat: "50.85°N", lng: "4.35°E" },
  { name: "Others", count: 1330, lat: "-", lng: "-" },
];

const GeoMapPage = () => {
  const totalAlumni = cities.reduce((s, c) => s + c.count, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Geo Map</h1>
        <p className="text-muted-foreground text-sm mt-1">Explore where our alumni are located worldwide</p>
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
      </div>

      {/* Map Placeholder */}
      <div className="card-elevated overflow-hidden">
        <div className="h-80 bg-muted flex items-center justify-center relative">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-accent mx-auto mb-3 animate-bounce" />
            <p className="text-muted-foreground text-sm">Interactive map will load here</p>
            <p className="text-xs text-muted-foreground mt-1">Connect a maps API to enable full functionality</p>
          </div>
          {/* Floating stat */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">{totalAlumni.toLocaleString()} Alumni</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cities.map(city => (
          <div key={city.name} className="stat-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{city.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{city.name}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default GeoMapPage;
