import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, User, Users, Briefcase, Calendar, Heart, Trophy, MapPin, BarChart3,
  Bell, ChevronDown, Menu, X, MessageCircle, LogOut, Settings, GraduationCap, ChevronLeft, ShieldCheck,
  Home, Info, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";

const mainNav = [
  { label: "Home", path: "/dashboard" },
  { label: "About Us", path: "/dashboard/about" },
  { label: "Events", path: "/dashboard/events" },
  { label: "Jobs", path: "/dashboard/jobs" },
  { label: "Donation", path: "/dashboard/donations" },
  { label: "Geo Map", path: "/dashboard/geomap" },
];

const moreItems = [
  { label: "Support", path: "/dashboard/support" },
  { label: "Contact", path: "/dashboard/contact" },
  { label: "News", path: "/dashboard/news" },
  { label: "Mentorship", path: "/dashboard/mentorship" },
  { label: "Resources", path: "/dashboard/resources" },
];

const sidebarItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", path: "/dashboard/profile", icon: User },
  { label: "Alumni", path: "/dashboard/alumni", icon: Users },
  { label: "Jobs", path: "/dashboard/jobs", icon: Briefcase },
  { label: "Events", path: "/dashboard/events", icon: Calendar },
  { label: "Donations", path: "/dashboard/donations", icon: Heart },
  { label: "Achievements", path: "/dashboard/achievements", icon: Trophy },
  { label: "Geo Map", path: "/dashboard/geomap", icon: MapPin },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors lg:mr-2">
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2 mr-6">
          <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground hidden sm:inline text-sm">ADCET Alumni</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {mainNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted font-medium"
            >
              {item.label}
            </NavLink>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1">
                More <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {moreItems.map(item => (
                <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r border-border bg-card overflow-hidden flex-shrink-0 hidden md:block"
            >
              <nav className="p-3 space-y-1">
                {sidebarItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="card-elevated w-80 h-96 mb-3 flex flex-col overflow-hidden"
            >
              <div className="hero-gradient px-4 py-3 flex items-center justify-between">
                <span className="text-primary-foreground font-medium text-sm">Alumni Assistant</span>
                <button onClick={() => setChatOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center">
                <p className="text-muted-foreground text-sm text-center">👋 Hi! How can I help you today?</p>
              </div>
              <div className="p-3 border-t border-border">
                <input placeholder="Type a message..." className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="h-5 w-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default DashboardLayout;
