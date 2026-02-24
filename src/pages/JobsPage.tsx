import { motion } from "framer-motion";
import { Search, MapPin, Clock, Briefcase, Building2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const jobs = [
  { id: 1, title: "Frontend Developer", company: "Infosys", location: "Pune", type: "Full-time", mode: "Hybrid", exp: "0-2 yrs", postedBy: "Rahul Patil (2018)", deadline: "Mar 20, 2026", skills: ["React", "TypeScript", "Tailwind"] },
  { id: 2, title: "Data Analyst", company: "TCS", location: "Mumbai", type: "Full-time", mode: "On-site", exp: "1-3 yrs", postedBy: "Sneha Kulkarni (2019)", deadline: "Mar 25, 2026", skills: ["Python", "SQL", "Power BI"] },
  { id: 3, title: "Backend Engineer Intern", company: "Startup XYZ", location: "Remote", type: "Internship", mode: "Remote", exp: "Fresher", postedBy: "Amit Joshi (2017)", deadline: "Apr 1, 2026", skills: ["Node.js", "MongoDB", "REST APIs"] },
  { id: 4, title: "ML Engineer", company: "Google", location: "Bangalore", type: "Full-time", mode: "On-site", exp: "3-5 yrs", postedBy: "Priya Sharma (2016)", deadline: "Mar 30, 2026", skills: ["Python", "TensorFlow", "MLOps"] },
  { id: 5, title: "UI/UX Designer", company: "Wipro", location: "Pune", type: "Contract", mode: "Hybrid", exp: "1-2 yrs", postedBy: "Kavita More (2020)", deadline: "Apr 5, 2026", skills: ["Figma", "Adobe XD", "Prototyping"] },
  { id: 6, title: "DevOps Engineer", company: "Persistent", location: "Pune", type: "Full-time", mode: "On-site", exp: "2-4 yrs", postedBy: "Suresh Patil (2015)", deadline: "Apr 10, 2026", skills: ["AWS", "Docker", "Kubernetes"] },
];

const JobsPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jobs & Opportunities</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse jobs posted by alumni and partner companies</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs, skills, companies..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Job Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
            <SelectItem value="pune">Pune</SelectItem>
            <SelectItem value="mumbai">Mumbai</SelectItem>
            <SelectItem value="bangalore">Bangalore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map(job => (
          <div key={job.id} className="card-elevated p-5 space-y-3 group hover:-translate-y-0.5 transition-transform">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{job.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" /> {job.company}
                </p>
              </div>
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{job.mode}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.type}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.exp}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {job.skills.map(s => (
                <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <p>By: {job.postedBy}</p>
                <p>Deadline: {job.deadline}</p>
              </div>
              <Button size="sm" className="text-xs">Apply Now</Button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default JobsPage;
