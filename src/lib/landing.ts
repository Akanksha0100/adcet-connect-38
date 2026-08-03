import type { AuthUser } from "@/lib/api";

/**
 * Where to send a user immediately after signing in or registering.
 * Admins go to the admin console; anyone still missing the mandatory profile
 * (an SSO sign-in, typically) is routed to onboarding first; approved members
 * land on the feed; everyone else lands on the dashboard, where
 * AccountStatusGate explains their status.
 */
export const landingRouteFor = (
  user: Pick<AuthUser, "roles" | "status"> & Partial<Pick<AuthUser, "profileComplete">>,
) => {
  if (user.roles.includes("ADMIN")) return "/admin";
  // `profileComplete` is only absent on placeholder users built before /me has
  // resolved; treating undefined as complete keeps those from flashing the form.
  if (user.profileComplete === false) return "/complete-profile";
  return user.status === "APPROVED" ? "/dashboard/feed" : "/dashboard";
};
