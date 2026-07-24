import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, User, Users, Briefcase, Calendar, Heart, Trophy, MapPin, BarChart3,
  Bell, ChevronDown, Menu, X, MessageCircle, LogOut, Settings, ChevronLeft, ShieldCheck, Send, Loader2,
  Home, Info, MoreHorizontal, Newspaper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { api } from "@/lib/api";
import NotificationsBell from "@/components/NotificationsBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const mainNav = [
  { label: "Home", path: "/dashboard" },
  { label: "Feed", path: "/dashboard/feed" },
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
  { label: "Feed", path: "/dashboard/feed", icon: Newspaper },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", path: "/dashboard/profile", icon: User },
  { label: "Alumni", path: "/dashboard/alumni", icon: Users },
  { label: "Jobs", path: "/dashboard/jobs", icon: Briefcase },
  { label: "My Job Posts", path: "/dashboard/jobs/mine", icon: Briefcase },
  { label: "Events", path: "/dashboard/events", icon: Calendar },
  { label: "Donations", path: "/dashboard/donations", icon: Heart },
  { label: "Achievements", path: "/dashboard/achievements", icon: Trophy },
  { label: "Geo Map", path: "/dashboard/geomap", icon: MapPin },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { label: "Notifications", path: "/dashboard/notifications", icon: Bell },
  { label: "Admin Panel", path: "/admin", icon: ShieldCheck, admin: true },
];

const DashboardLayout = () => {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "👋 Hi! How can I help you today?" },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  // Close mobile sidebar on route change
  const location = useLocation();
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await api.post<{ reply: string }>("/assistant/chat", { message: text });
      setMessages((m) => [...m, { role: "bot", content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", content: "This feature is not implemented and coming soon." },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isApproved = user?.status === "APPROVED";

  const visibleMainNav = isApproved
    ? mainNav
    : mainNav.filter((i) => ["Home", "About Us"].includes(i.label));
  const visibleMoreItems = isApproved
    ? moreItems
    : moreItems.filter((i) => ["Support", "Contact", "News"].includes(i.label));
  const visibleSidebar = isApproved
    ? sidebarItems
    : sidebarItems.filter((i) => ["Profile"].includes(i.label));

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Shared sidebar content for both mobile and desktop
  const SidebarContent = () => (
    <nav className="p-3 space-y-1">
      {visibleSidebar.filter(i => !(i as any).admin).map(item => (
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

      {isAdmin && isApproved && (
        <div className="border-t border-border my-2 pt-2">
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-accent hover:bg-accent/10 transition-colors font-medium"
            activeClassName="bg-accent/10"
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>Admin Panel</span>
          </NavLink>
        </div>
      )}

      {!isApproved && (
        <NavLink
          to="/dashboard/status"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-amber-600 bg-amber-500/10 mt-2"
          activeClassName=""
        >
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          <span>Account status</span>
        </NavLink>
      )}
    </nav>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Nav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-3 md:px-4 gap-2 md:gap-4 sticky top-0 z-50">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors hidden md:block lg:mr-2"
        >
          {desktopSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2 mr-2 md:mr-6">
          <img src="/logo.jpeg" alt="ADCET Logo" className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-cover" />
          <span className="font-bold text-foreground hidden sm:inline text-sm">ADCET Alumni</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {visibleMainNav.map(item => (
            <NavLink
              key={item.path}
              to={item.label === "Home" && !isApproved ? "/dashboard/status" : item.path}
              end={item.path === "/dashboard"}
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted font-medium"
            >
              {item.label}
            </NavLink>
          ))}

          {visibleMoreItems.length > 0 && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1">
                More <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {visibleMoreItems.map(item => (
                <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>}
        </nav>

        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <ThemeSwitcher />
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
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
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* min-h-0 lets the children own the vertical scroll instead of growing
          the page — so the sidebar stays put and only <main> scrolls. */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="sidebar-overlay md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-xl md:hidden overflow-y-auto"
              >
                <div className="h-14 border-b border-border flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <img src="/logo.jpeg" alt="ADCET Logo" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="font-bold text-foreground text-sm">ADCET Alumni</span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <SidebarContent />

                {/* Mobile nav items (shown in sidebar on mobile) */}
                <div className="border-t border-border mx-3 my-2 pt-2">
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</p>
                  {[...visibleMainNav, ...visibleMoreItems].map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <AnimatePresence>
          {desktopSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r border-border bg-card overflow-hidden flex-shrink-0 hidden md:flex md:flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Chatbot */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="card-elevated w-[calc(100vw-2rem)] sm:w-80 h-80 sm:h-96 mb-3 flex flex-col overflow-hidden"
            >
              <div className="hero-gradient px-4 py-3 flex items-center justify-between">
                <span className="text-primary-foreground font-medium text-sm">Alumni Assistant</span>
                <button onClick={() => setChatOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form
                className="p-3 border-t border-border flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  disabled={chatBusy}
                />
                <Button type="submit" size="icon" disabled={chatBusy || !chatInput.trim()} aria-label="Send message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full hero-gradient flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default DashboardLayout;
