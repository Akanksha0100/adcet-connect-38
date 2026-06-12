import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, UserCheck, Calendar, Briefcase, Trophy, Heart, BarChart3,
  AlertTriangle, Settings, Bell, Menu, ChevronLeft, LogOut,
  Search, User, Globe, FileText, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import NotificationsBell from "@/components/NotificationsBell";

interface AdminOverview {
  pendingUsers: number;
  pendingEvents: number;
  pendingJobs: number;
  pendingAchievements: number;
}

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: overview } = useQuery({
    queryKey: ["analytics", "admin-overview"],
    queryFn: () => api.get<AdminOverview>("/analytics/admin/overview"),
    refetchInterval: 60_000,
  });

  const fmt = (n?: number) => (n && n > 0 ? (n > 99 ? "99+" : String(n)) : undefined);

  const sidebarItems = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, badge: undefined as string | undefined },
    { label: "User Approvals", path: "/admin/approvals", icon: UserCheck, badge: fmt(overview?.pendingUsers) },
    { label: "Events Approval", path: "/admin/events", icon: Calendar, badge: fmt(overview?.pendingEvents) },
    { label: "Jobs Approval", path: "/admin/jobs", icon: Briefcase, badge: fmt(overview?.pendingJobs) },
    { label: "Achievements", path: "/admin/achievements", icon: Trophy, badge: fmt(overview?.pendingAchievements) },
    { label: "Donations", path: "/admin/donations", icon: Heart, badge: undefined },
    { label: "Reports", path: "/admin/reports", icon: AlertTriangle, badge: undefined },
    { label: "Geo Map", path: "/admin/geomap", icon: Globe, badge: undefined },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3, badge: undefined },
    { label: "Site Content", path: "/admin/site-content", icon: FileText, badge: undefined },
    { label: "Support Inbox", path: "/admin/support", icon: MessageSquare, badge: undefined },
    { label: "Settings", path: "/admin/settings", icon: Settings, badge: undefined },
  ];

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "AD"
    : "AD";
  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors">
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2 mr-4">
          <img src="/logo.jpeg" alt="ADCET Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-foreground hidden sm:inline text-sm">ADCET Admin</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search anything..." className="pl-9 bg-muted border-0" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings")}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
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
                {sidebarItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] h-5 min-w-[20px] justify-center">
                        {item.badge}
                      </Badge>
                    )}
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
    </div>
  );
};

export default AdminLayout;
