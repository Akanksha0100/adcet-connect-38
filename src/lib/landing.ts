import type { AuthUser } from "@/lib/api";

/**
 * Where to send a user immediately after signing in or registering.
 * Approved members land on the feed; admins go to the admin console; everyone
 * else lands on the dashboard, where AccountStatusGate explains their status.
 */
export const landingRouteFor = (user: Pick<AuthUser, "roles" | "status">) => {
  if (user.roles.includes("ADMIN")) return "/admin";
  return user.status === "APPROVED" ? "/dashboard/feed" : "/dashboard";
};
