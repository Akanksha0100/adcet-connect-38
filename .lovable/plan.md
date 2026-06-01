# Plan: Jobs, Events & Notifications — Detail pages, Management, Messaging

Large scope, broken into 3 tracks. Backend-first per track, then frontend, then tests.

---

## 1) JOBS

### Backend
- **Schema (`prisma/schema.prisma`)** — add to `Job`: `isClosed Boolean @default(false)`, `closedAt DateTime?`. Add to `JobApplication`: `resumeKey String?` (already exists), `resumeDeletedAt DateTime?`. Add `SiteSetting` row key `resume_retention_days` (default 180) via existing content/settings infra.
- **`jobs.service.ts`**:
  - `list` — filter out `isClosed` unless explicitly requested; add `closed` filter; admin can see all statuses.
  - `apply` — reject if `isClosed`. Resume required (validator-enforced).
  - `closeApplications(caller, id)` — owner/admin only, sets `isClosed=true`.
  - `reopen(caller, id)` — inverse.
  - `listApplications` — return applicant profile snapshot + signed resume URL.
  - `myPostedJobs(caller)` — for poster panel.
- **`jobs.validators.ts`** — `applySchema` requires `resumeKey`; close/reopen schemas.
- **`jobs.controller.ts`** + **routes** — `POST /:id/close`, `POST /:id/reopen`, `GET /mine/posted`, `GET /:id/applications` (already there, ensure poster scope).
- **`uploads.validators.ts`** — add scope `resume`, enforce `application/pdf` only.
- **Resume retention cron**: new `src/jobs/resumeCleanup.ts` — daily sweep; called from server boot via `setInterval` guarded behind env flag. Deletes storage + nulls `resumeKey`, sets `resumeDeletedAt`.
- **Admin** — `admin.service.ts` add `listAllJobsWithApplications` for admin job panel.

### Frontend
- `JobsPage.tsx` — make cards clickable → `/jobs/:id`; add Closed filter chip.
- `JobDetailPage.tsx` — already exists; wire Apply dialog with PDF upload (presign → PUT → submit), show "Closed" banner, hide Apply if closed.
- New `src/pages/MyJobPostsPage.tsx` (route `/jobs/mine`) — list jobs the user posted; per-job: view applications drawer (applicant name, email, profile link, resume download), Close/Reopen button.
- `JobApprovalsPage.tsx` — add status filter tabs (Pending/Approved/Rejected).
- Admin `AdminJobsPanelPage.tsx` (route `/admin/jobs`) — table of all jobs with poster, status, closed state, applications count, drilldown to applications.

### Tests
- Service unit tests: close/reopen RBAC, apply blocked when closed, retention cleanup logic.
- Integration tests: PDF-only enforcement (422 on wrong content-type), `/jobs/:id/close` 403 non-owner, applications listing scope.

---

## 2) EVENTS

### Backend
- **Schema** — add `Event.meetingUrl String?`.
- **`events.validators.ts`** — if `isOnline`, `meetingUrl` required (zod refine, must be URL).
- **`events.service.ts`** — `listRsvps` already exists; ensure includes profile snapshot. Add `myPostedEvents`.
- **`events.controller.ts`/routes** — `GET /mine/posted`, ensure `GET /:id/rsvps` returns attendee info to owner/admin.

### Frontend
- `EventsPage.tsx` — confirm cards clickable to `/events/:id`. Replace broken date emoji image with `<img src="/event-card-banner.svg">` properly sized (object-cover, rounded-t).
- `EventDetailPage.tsx` — show meeting URL when online; back arrow.
- `EventApprovalsPage.tsx` — make admin cards clickable to event detail view. Status filter tabs.
- New `src/pages/MyEventsPage.tsx` (`/events/mine`) — events user created with attendees drawer (RSVP list).
- New event create/edit form: when `isOnline` toggled, show & require Meeting URL field.

### Tests
- Service: meetingUrl validation, myPostedEvents scope.
- Integration: 422 when isOnline=true without meetingUrl.

---

## 3) NOTIFICATIONS & ADMIN→USER MESSAGING

### Backend
- **Schema** — `Notification` already has `title/body/data`. Add admin message type: reuse existing `notify()` with `type:"admin.message"`.
- **`notifications.service.ts`** — add `sendAdminMessage(adminId, userId, subject, body)`. Persist as notification with `data:{ fromAdminId }`.
- **`admin.controller.ts`/routes** — `POST /admin/users/:id/message` (admin only, validator: subject ≤120, body ≤2000).

### Frontend
- New `src/pages/NotificationPage.tsx` (route `/notifications/:id`) — full notification view; mark as read on open; back arrow.
- `NotificationsBell.tsx` — bell items become links to `/notifications/:id` (or to deep-linked entity if `data.jobId`/`eventId` present).
- `AdminUserDetailPage.tsx` — add "Send message" icon button → dialog with subject/body → POST to admin message endpoint → toast.

### Tests
- Service: admin message persisted + notification created.
- Integration: non-admin gets 403 on message endpoint; payload validation.

---

## Technical notes
- PDF-only resume upload validated server-side in presign (`contentType==="application/pdf"`) and client-side via `accept=".pdf"` + file.type check.
- Retention cleanup is idempotent and logged; failure to delete storage is non-fatal (logs + retries next sweep).
- All new routes guarded by `requireAuth` + `requireApproved`; admin routes also `requireRole("ADMIN")`.
- Status-filter UI uses URL search params for shareability.
- Keep coverage ≥80% branches; add tests alongside each new service/controller.

## Deliverables
- ~10 backend files edited, ~4 new files
- ~6 frontend pages new/edited
- New migration for `isClosed`, `closedAt`, `meetingUrl`
- ~25 new tests across unit + integration

Proceed?
