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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
