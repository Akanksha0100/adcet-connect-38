/**
 * Wraps protected dashboard routes and redirects PENDING/REJECTED users to
 * a status screen for any path that is not in the allow-list (profile, about,
 * support, news, contact and the status screen itself).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_PATHS = [
  "/dashboard/status",
  "/dashboard/profile",
  "/dashboard/about",
  "/dashboard/support",
  "/dashboard/news",
  "/dashboard/contact",
];

export const AccountStatusGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Outlet />; // ProtectedRoute already handled this
  if (user.status === "APPROVED") return <Outlet />;

  const allowed = ALLOWED_PATHS.some((p) => location.pathname === p);
  if (allowed) return <Outlet />;
  return <Navigate to="/dashboard/status" replace />;
};

export default AccountStatusGate;