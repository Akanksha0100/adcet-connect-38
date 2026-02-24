import { motion } from "framer-motion";
import { Search, Filter, MapPin, Clock, Users, ExternalLink, Calendar as CalIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const events = [
  { id: 1, name: "Alumni Meet 2026", date: "Mar 15, 2026", time: "10:00 AM", location: "ADCET Campus", type: "Meetup", mode: "Offline", seats: 42, speaker: "Dr. Patil", desc: "Annual gathering of ADCET alumni across all batches." },
  { id: 2, name: "Web Dev Bootcamp", date: "Mar 8, 2026", time: "2:00 PM", location: "Google Meet", type: "Webinar", mode: "Online", seats: 120, speaker: "Ankit Sharma (2018)", desc: "Full-stack web development workshop with React & Node." },
  { id: 3, name: "Hackathon 2026", date: "Apr 5, 2026", time: "9:00 AM", location: "ADCET Auditorium", type: "Hackathon", mode: "Offline", seats: 8, speaker: "Alumni Committee", desc: "24-hour coding marathon with exciting prizes." },
  { id: 4, name: "AI/ML Seminar", date: "Mar 20, 2026", time: "4:00 PM", location: "Zoom", type: "Webinar", mode: "Online", seats: 200, speaker: "Priya Kulkarni (2017)", desc: "Introduction to machine learning for beginners." },
];

const tabs = ["Upcoming", "Ongoing", "Past"];

const EventsPage = () => {
  const [activeTab, setActiveTab] = useState("Upcoming");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        <p className="text-muted-foreground text-sm mt-1">Discover and register for upcoming alumni events</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="meetup">Meetup</SelectItem>
            <SelectItem value="hackathon">Hackathon</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === tab ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(event => (
          <div key={event.id} className="card-elevated overflow-hidden group">
            <div className="hero-gradient h-2" />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{event.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.desc}</p>
                </div>
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{event.type}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalIcon className="h-3 w-3" /> {event.date} · {event.time}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.seats} seats left</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">Speaker: {event.speaker}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs">View Details</Button>
                  <Button size="sm" className="text-xs">Register Now</Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default EventsPage;
