/**
 * Route guard.
 * - `authOnly`: requires a logged-in user. Redirects to `/` if not.
 * - `roles`: optional list — caller must hold at least one role to enter.
 *   When set and the user lacks the role, redirects to `/dashboard` (or `/`).
 *
 * Pending users (status !== APPROVED) are allowed into `/dashboard` but blocked
 * from `/admin`. Approval status gating beyond that is enforced server-side.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Props {
  roles?: AppRole[];
  /** Where to send unauthorized callers. Defaults to `/`. */
  redirectTo?: string;
}

const Splash = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export const ProtectedRoute = ({ roles, redirectTo = "/" }: Props) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    // Logged-in but missing role — bounce to dashboard.
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
