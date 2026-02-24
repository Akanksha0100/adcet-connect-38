import { motion } from "framer-motion";
import { User, MapPin, Briefcase, GraduationCap, Mail, Phone, Edit, FileText, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const tabs = ["Personal", "Academic", "Professional", "Resume", "Activity", "Badges"];

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("Personal");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header Card */}
      <div className="card-elevated overflow-hidden">
        <div className="hero-gradient h-28" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-card">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">John Doe</h1>
              <p className="text-sm text-muted-foreground">Software Engineer · Batch 2020</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Pune, India</span>
                <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />Computer Engineering</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />Infosys</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Edit className="h-3 w-3" /> Edit Profile
            </Button>
          </div>

          <div className="flex gap-3 mt-4">
            <Badge variant="secondary">Alumni</Badge>
            <Badge className="bg-accent/10 text-accent border-0">Verified</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tab ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card-elevated p-6">
        {activeTab === "Personal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Full Name", value: "John Doe", icon: User },
              { label: "Email", value: "john.doe@example.com", icon: Mail },
              { label: "Phone", value: "+91 98765 43210", icon: Phone },
              { label: "Location", value: "Pune, Maharashtra", icon: MapPin },
              { label: "Batch", value: "2016 - 2020", icon: GraduationCap },
              { label: "Department", value: "Computer Engineering", icon: GraduationCap },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === "Badges" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Rising Star", "Top Contributor", "Event Organizer", "Mentor"].map(badge => (
              <div key={badge} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground">{badge}</span>
              </div>
            ))}
          </div>
        )}
        {!["Personal", "Badges"].includes(activeTab) && (
          <p className="text-muted-foreground text-sm text-center py-8">Content for {activeTab} section coming soon.</p>
        )}
      </div>
    </motion.div>
  );
};

export default ProfilePage;
