import { motion } from "framer-motion";
import { Search, Users, MapPin, GraduationCap, Briefcase, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const alumni = [
  { name: "Priya Sharma", batch: "2019", dept: "Computer Eng.", role: "SDE at Google", location: "Bangalore", initials: "PS" },
  { name: "Rahul Patil", batch: "2018", dept: "IT", role: "Founder, AI Labs", location: "Pune", initials: "RP" },
  { name: "Sneha Kulkarni", batch: "2020", dept: "E&TC", role: "Data Scientist at TCS", location: "Mumbai", initials: "SK" },
  { name: "Amit Joshi", batch: "2017", dept: "Mechanical", role: "Product Manager at Flipkart", location: "Delhi", initials: "AJ" },
  { name: "Kavita More", batch: "2021", dept: "Computer Eng.", role: "Frontend Dev at Infosys", location: "Pune", initials: "KM" },
  { name: "Suresh Patil", batch: "2016", dept: "Civil", role: "Site Engineer at L&T", location: "Hyderabad", initials: "SP" },
];

const AlumniDirectoryPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Directory</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect with fellow alumni</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search alumni by name, company..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            <SelectItem value="2021">2021</SelectItem>
            <SelectItem value="2020">2020</SelectItem>
            <SelectItem value="2019">2019</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="cs">Computer Eng.</SelectItem>
            <SelectItem value="it">IT</SelectItem>
            <SelectItem value="entc">E&TC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alumni.map(a => (
          <div key={a.name} className="card-elevated p-5 flex items-start gap-4 hover:-translate-y-0.5 transition-transform">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{a.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{a.name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3 w-3" /> {a.role}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {a.batch} · {a.dept}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-xs h-7">View Profile</Button>
                <Button size="sm" className="text-xs h-7"><Mail className="h-3 w-3 mr-1" /> Connect</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AlumniDirectoryPage;
