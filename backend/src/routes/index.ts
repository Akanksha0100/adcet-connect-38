/**
 * Central API router. Each module mounts at its versioned path.
 * Adding a new module = one import + one `use(...)`. No business logic here.
 */
import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { profilesRouter } from "../modules/profiles/profiles.routes.js";
import { eventsRouter } from "../modules/events/events.routes.js";
import { jobsRouter } from "../modules/jobs/jobs.routes.js";
import { achievementsRouter } from "../modules/achievements/achievements.routes.js";
import { donationsRouter } from "../modules/donations/donations.routes.js";
import { alumniRouter } from "../modules/alumni/alumni.routes.js";
import { geoRouter } from "../modules/geo/geo.routes.js";
import { analyticsRouter } from "../modules/analytics/analytics.routes.js";
import { notificationsRouter } from "../modules/notifications/notifications.routes.js";
import { uploadsRouter } from "../modules/uploads/uploads.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { contentRouter } from "../modules/content/content.routes.js";
import { feedRouter } from "../modules/feed/feed.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/profiles", profilesRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/achievements", achievementsRouter);
apiRouter.use("/donations", donationsRouter);
apiRouter.use("/alumni", alumniRouter);
apiRouter.use("/geo", geoRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/uploads", uploadsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/content", contentRouter);
apiRouter.use("/feed", feedRouter);

// Assistant chatbot — placeholder until a real LLM/agent is wired up.
apiRouter.post("/assistant/chat", (_req, res) =>
  res.json({
    reply: "This feature is not implemented and coming soon.",
    timestamp: new Date().toISOString(),
  }),
);