import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import EventsPage from "./pages/EventsPage";
import JobsPage from "./pages/JobsPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />

            {/* Any logged-in user (any role) can access /dashboard. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="achievements" element={<AchievementsPage />} />
                <Route path="donations" element={<DonationsPage />} />
                <Route path="geomap" element={<GeoMapPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="alumni" element={<AlumniDirectoryPage />} />
              </Route>
            </Route>

            {/* Admin-only area. */}
            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="approvals" element={<UserApprovalsPage />} />
                <Route path="events" element={<EventApprovalsPage />} />
                <Route path="jobs" element={<JobApprovalsPage />} />
                <Route path="achievements" element={<AchievementsAdminPage />} />
                <Route path="donations" element={<DonationsAdminPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="geomap" element={<AdminGeoMapPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
