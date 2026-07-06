import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import NewsPage from "./pages/NewsPage";
import SupportPage from "./pages/SupportPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import EventsPage from "./pages/EventsPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import MyJobPostsPage from "./pages/MyJobPostsPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotificationPage from "./pages/NotificationPage";
import ProfilePage from "./pages/ProfilePage";
import AchievementsPage from "./pages/AchievementsPage";
import DonationsPage from "./pages/DonationsPage";
import GeoMapPage from "./pages/GeoMapPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AlumniDirectoryPage from "./pages/AlumniDirectoryPage";
import NotFound from "./pages/NotFound";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserApprovalsPage from "./pages/admin/UserApprovalsPage";
import EventApprovalsPage from "./pages/admin/EventApprovalsPage";
import JobApprovalsPage from "./pages/admin/JobApprovalsPage";
import AchievementsAdminPage from "./pages/admin/AchievementsAdminPage";
import DonationsAdminPage from "./pages/admin/DonationsAdminPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import AdminGeoMapPage from "./pages/admin/AdminGeoMapPage";
import SiteContentPage from "./pages/admin/SiteContentPage";
import StaticContentPage from "./pages/StaticContentPage";
import AccountStatusPage from "./pages/AccountStatusPage";
import AccountStatusGate from "./components/AccountStatusGate";
import SupportInboxPage from "./pages/admin/SupportInboxPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />

              {/* Any logged-in user (any role) can access /dashboard. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route element={<AccountStatusGate />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="events" element={<EventsPage />} />
                    <Route path="events/:id" element={<EventDetailPage />} />
                    <Route path="jobs" element={<JobsPage />} />
                    <Route path="jobs/:id" element={<JobDetailPage />} />
                    <Route path="jobs/mine" element={<MyJobPostsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="notifications/:id" element={<NotificationPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="achievements" element={<AchievementsPage />} />
                    <Route path="donations" element={<DonationsPage />} />
                    <Route path="geomap" element={<GeoMapPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="alumni" element={<AlumniDirectoryPage />} />
                    <Route path="about" element={<StaticContentPage contentKey="about" />} />
                    <Route path="support" element={<StaticContentPage contentKey="support" />} />
                    <Route path="contact" element={<StaticContentPage contentKey="contact" />} />
                    <Route path="news" element={<StaticContentPage contentKey="news" />} />
                    <Route path="mentorship" element={<StaticContentPage contentKey="mentorship" />} />
                    <Route path="resources" element={<StaticContentPage contentKey="resources" />} />
                    <Route path="status" element={<AccountStatusPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Admin-only area. */}
              <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="approvals" element={<UserApprovalsPage />} />
                  <Route path="users/:id" element={<AdminUserDetailPage />} />
                  <Route path="events" element={<EventApprovalsPage />} />
                  <Route path="jobs" element={<JobApprovalsPage />} />
                  <Route path="achievements" element={<AchievementsAdminPage />} />
                  <Route path="donations" element={<DonationsAdminPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="geomap" element={<AdminGeoMapPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="site-content" element={<SiteContentPage />} />
                  <Route path="support" element={<SupportInboxPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
