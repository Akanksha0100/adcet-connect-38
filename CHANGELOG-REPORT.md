# ADCET Alumni Portal - Detailed Change Report

**Base Commit:** `f0d9c36` — _fix: cv upload problem feat: admin access to job posts, donation scrshot_
**Date:** 2026-07-05
**Scope:** 48 files changed, +3,153 lines / -467 lines

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database & Schema Changes](#2-database--schema-changes)
3. [Backend: New Features](#3-backend-new-features)
4. [Backend: Mailer Rewrite](#4-backend-mailer-rewrite)
5. [Backend: Email Templates](#5-backend-email-templates)
6. [Backend: Event Reminder Cron Job](#6-backend-event-reminder-cron-job)
7. [Backend: Admin Module Enhancements](#7-backend-admin-module-enhancements)
8. [Backend: Registration Step 2](#8-backend-registration-step-2)
9. [Frontend: Theme System](#9-frontend-theme-system)
10. [Frontend: Multi-Step Registration](#10-frontend-multi-step-registration)
11. [Frontend: Events Page Overhaul](#11-frontend-events-page-overhaul)
12. [Frontend: Jobs Page Overhaul](#12-frontend-jobs-page-overhaul)
13. [Frontend: Profile Page Enhancements](#13-frontend-profile-page-enhancements)
14. [Frontend: Mobile Responsiveness](#14-frontend-mobile-responsiveness)
15. [Frontend: Admin User Approvals Page](#15-frontend-admin-user-approvals-page)
16. [Bugs Fixed](#16-bugs-fixed)
17. [Security Fixes](#17-security-fixes)
18. [Test Suite Updates](#18-test-suite-updates)
19. [Documentation Updates](#19-documentation-updates)
20. [File-by-File Change Summary](#20-file-by-file-change-summary)

---

## 1. Overview

This release adds production-readiness features across the full stack: email notifications with in-email RSVP, event reminders, department-targeted notifications, file attachments, multi-step registration with social links, 5 switchable themes, bulk user approval, and comprehensive mobile responsiveness. The mailer was rewritten from a stub to a production-ready SMTP transport, and all email templates include XSS protection.

### Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Test Suites | 46 passing | 48 passing |
| Tests | ~400 | 421 |
| Email Templates | 0 | 7 branded HTML templates |
| Background Jobs | resume cleanup only | + event reminders cron |
| Themes | 1 (default) | 5 (default, ocean, sunset, forest, royal) |
| Registration Steps | 1 | 2 (with social links) |

---

## 2. Database & Schema Changes

**Migration:** `20260630180000_add_attachments_department_theme_emailrsvp`

### New Enum: `EmailRsvpStatus`
```prisma
enum EmailRsvpStatus {
  YES
  NO
  NOT_SURE
  MAYBE
}
```
Used to track which option a user selected when responding to an event via email link.

### Model Changes

| Model | Field | Type | Purpose |
|-------|-------|------|---------|
| `Profile` | `twitterUrl` | `String?` | Twitter/X profile URL (new social link) |
| `UserPreferences` | `theme` | `String` (default `"default"`) | Persisted theme choice per user |
| `Event` | `attachmentKey` | `String?` | S3/MinIO key for event file attachment |
| `Event` | `department` | `String?` | Target department for email notifications |
| `EventRsvp` | `emailRsvpStatus` | `EmailRsvpStatus?` | Tracks the exact email RSVP response |
| `Job` | `attachmentKey` | `String?` | S3/MinIO key for job file attachment |
| `Job` | `department` | `String?` | Department filter for job listings & notifications |

### Migration SQL
```sql
CREATE TYPE "EmailRsvpStatus" AS ENUM ('YES', 'NO', 'NOT_SURE', 'MAYBE');
ALTER TABLE "Profile" ADD COLUMN "twitterUrl" TEXT;
ALTER TABLE "UserPreferences" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Event" ADD COLUMN "attachmentKey" TEXT;
ALTER TABLE "Event" ADD COLUMN "department" TEXT;
ALTER TABLE "EventRsvp" ADD COLUMN "emailRsvpStatus" "EmailRsvpStatus";
ALTER TABLE "Job" ADD COLUMN "attachmentKey" TEXT;
ALTER TABLE "Job" ADD COLUMN "department" TEXT;
```

---

## 3. Backend: New Features

### 3.1 Event Email Notifications with In-Email RSVP

**Files:** `events.service.ts`, `events.controller.ts`, `events.routes.ts`, `events.validators.ts`

When an admin creates an event, the system now:
1. Creates the event with `status: APPROVED` (admin-only creation)
2. Fires an async (fire-and-forget) email notification to all alumni in the targeted department
3. Each email contains 4 personalized RSVP buttons: **Yes**, **Maybe**, **Not Sure**, **No**
4. Each button is a signed JWT link (`GET /events/:id/email-rsvp?token=...&response=YES`)

**New endpoint:** `GET /api/v1/events/:id/email-rsvp`
- Public endpoint (no auth required — uses signed JWT in query params)
- Validates `token` and `response` via `emailRsvpSchema`
- Records the RSVP in the database (upsert)
- Returns a branded HTML confirmation page

**How RSVP tokens work:**
- Each token is a JWT signed with `JWT_ACCESS_SECRET`, containing `{ userId, eventId }`
- Tokens expire after 30 days
- The response maps to in-app RSVP statuses: `YES→GOING`, `MAYBE/NOT_SURE→INTERESTED`, `NO→NOT_GOING`

### 3.2 Department-Targeted Job Notifications

**File:** `jobs.service.ts`

When an admin approves a job posting (`moderate()` → status `APPROVED`):
1. Finds all approved alumni in the job's target department (or all alumni if no department)
2. Filters out users who opted out of email notifications
3. Sends branded HTML emails via `sendBulkEmails()`

### 3.3 Rich Job Application Emails

**File:** `jobs.service.ts`

Previously, job application notifications were simple in-app notifications. Now:
1. Fetches full applicant profile (department, graduation year, company, role, LinkedIn)
2. Sends a branded HTML email to the job poster with all applicant details
3. Attaches the applicant's resume PDF (fetched via presigned download URL from S3/MinIO)
4. The in-app notification is still created but `sendEmailToo` is set to `false` (the rich email replaces it)

### 3.4 Event Sort Order Fix

**File:** `events.service.ts`

**Before:** All events sorted by `startsAt: "asc"` (ascending) regardless of context.
**After:** Upcoming events sort ascending (soonest first), past events sort descending (most recent first). This is more intuitive for browsing.

### 3.5 Department Filter on Events and Jobs

**Files:** `events.service.ts`, `events.validators.ts`, `jobs.service.ts`, `jobs.validators.ts`

Both events and jobs list endpoints now accept an optional `department` query parameter to filter results by department. The validator schemas were updated to accept this parameter.

---

## 4. Backend: Mailer Rewrite

**File:** `backend/src/lib/mailer.ts`

### Before (Stub)
The mailer was a simple stub that logged emails to the console in dev and was a no-op in tests. It had no real SMTP capability, no attachment support, and no bulk send.

### After (Production-Ready)
Complete rewrite with a pluggable transport architecture:

| Transport | When Used | Behavior |
|-----------|-----------|----------|
| `NoopTransport` | `NODE_ENV === "test"` | Silent no-op |
| `ConsoleTransport` | No `SMTP_HOST` set | Pretty-prints email to console (dev) |
| `SmtpTransport` | `SMTP_HOST` is set | Real SMTP via Nodemailer |

**New capabilities:**
- **Attachment support:** `EmailAttachment` interface with `filename`, `content` (Buffer/string), `path` (URL), `contentType`
- **Bulk send:** `sendBulkEmails()` sends each email individually, uses `Promise.allSettled()` for partial failure tolerance, logs failure counts
- **Transport reset:** `_resetTransport()` exported for testing
- **Multiple recipients:** `to` field accepts `string | string[]`

**New env vars:**
| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_HOST` | _(empty)_ | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Use TLS |
| `SMTP_USER` | _(empty)_ | SMTP username |
| `SMTP_PASS` | _(empty)_ | SMTP password |
| `SMTP_FROM` | `"ADCET Alumni Portal" <noreply@adcet.in>` | From address |

---

## 5. Backend: Email Templates

**File:** `backend/src/lib/email-templates.ts` (NEW — 540 lines)

7 branded HTML email template functions, all sharing a consistent header/footer wrapper with ADCET branding (gradient header, logo text, copyright footer).

| Template Function | Purpose | Used By |
|------------------|---------|---------|
| `eventNotificationEmail()` | New event notification with RSVP buttons | `events.service.ts` on event create |
| `eventReminderEmail()` | "Tomorrow" reminder for GOING/INTERESTED users | `eventReminders.ts` cron job |
| `eventNonResponderReminderEmail()` | "Last chance to RSVP" nudge for non-responders | `eventReminders.ts` cron job |
| `eventRsvpSummaryEmail()` | RSVP count summary (going/interested/not going) | `eventReminders.ts` cron job |
| `jobNotificationEmail()` | New job opportunity notification | `jobs.service.ts` on job approval |
| `jobApplicationEmail()` | Application details + resume for job poster | `jobs.service.ts` on job apply |
| `rsvpConfirmationHtml()` | HTML page returned after email RSVP click | `events.service.ts` email RSVP handler |

**Security:** All user-controlled values are escaped with an `esc()` helper that converts `& < > " '` to HTML entities, preventing XSS injection through event titles, descriptions, applicant names, cover letters, etc.

**Design features:**
- Responsive email layout (max-width 600px)
- CSS badge classes for department tags, online/offline status
- Color-coded RSVP buttons (green=Yes, yellow=Maybe, gray=Not Sure, red=No)
- RSVP summary uses color-coded stat blocks
- All emails include a "View on Portal" CTA button

---

## 6. Backend: Event Reminder Cron Job

**File:** `backend/src/jobs/eventReminders.ts` (NEW — 175 lines)

### How It Works
- `startEventReminderCron()` is called on server startup (`server.ts`)
- Runs `runEventReminders()` immediately on startup, then every 24 hours via `setInterval`
- Returns a `stopEventReminders()` handle for graceful shutdown

### `runEventReminders()` Logic
1. **Find tomorrow's events:** Queries for APPROVED events starting between 24-48 hours from now, including their RSVPs and RSVP user details
2. **For each event, sends 3 types of emails:**

| Email Type | Recipients | Template |
|-----------|------------|----------|
| Reminder | Users with RSVP status `GOING` or `INTERESTED` | `eventReminderEmail()` |
| Non-responder nudge | Alumni who haven't RSVP'd (filtered by event department if set) | `eventNonResponderReminderEmail()` |
| RSVP summary | All alumni (filtered by department) | `eventRsvpSummaryEmail()` |

3. **Respects preferences:** Users who set `notificationsEmail: false` are excluded from all emails
4. **Returns stats:** `{ eventsProcessed, remindersSent, nonResponderRemindersSent }`

### Integration
```typescript
// server.ts
import { startEventReminderCron } from "./jobs/eventReminders.js";
const stopEventReminders = startEventReminderCron();
// In shutdown handler:
stopEventReminders();
```

---

## 7. Backend: Admin Module Enhancements

### 7.1 Bulk User Status (Approve/Reject)

**Files:** `admin.controller.ts`, `admin.routes.ts`, `admin.service.ts`, `admin.validators.ts`

**New endpoint:** `POST /api/v1/admin/users/bulk-status`

**Request body:**
```json
{
  "userIds": ["uuid-1", "uuid-2", ...],  // 1-100 UUIDs
  "status": "APPROVED" | "REJECTED",
  "reason": "optional rejection reason"
}
```

**Response:**
```json
{
  "updated": [{ "id": "uuid-1", "status": "APPROVED" }, ...],
  "errors": [{ "id": "uuid-3", "error": "Not found" }],
  "total": 3
}
```

**Implementation:** Iterates over users sequentially (not a single transaction), so partial success is possible. Each user gets their own audit log entry and notification via the existing `setUserStatus()` function.

### 7.2 Route Ordering Fix
The `POST /users/bulk-status` route is now registered **before** all `/:id` routes to prevent Express from matching `"bulk-status"` as an `:id` parameter.

---

## 8. Backend: Registration Step 2

**Files:** `auth.validators.ts`, `auth.service.ts`

### Validator Changes
The `registerSchema` now includes Step 2 fields:

| Field | Type | Validation | Required? |
|-------|------|-----------|-----------|
| `linkedinUrl` | string | Min 1 char, max 500, must start with `https?://` | **Yes** |
| `githubUrl` | string | Max 500, valid URL | No |
| `twitterUrl` | string | Max 500, valid URL | No |
| `websiteUrl` | string | Max 500, valid URL | No |
| `phone` | string | Max 40 chars | No |
| `city` | string | Max 120 chars | No |
| `bio` | string | Max 2000 chars | No |
| `currentCompany` | string | Max 160 chars | No |
| `currentRole` | string | Max 160 chars | No |

### Service Changes
`auth.service.ts` `register()` now saves all new fields in the `profile.create` block:
```typescript
profile: {
  create: {
    linkedinUrl: data.linkedinUrl,
    githubUrl: data.githubUrl,
    twitterUrl: data.twitterUrl,
    websiteUrl: data.websiteUrl,
    phone: data.phone,
    city: data.city,
    bio: data.bio,
    currentCompany: data.currentCompany,
    currentRole: data.currentRole,
  },
},
```

---

## 9. Frontend: Theme System

### Files
- `src/contexts/ThemeContext.tsx` (NEW — 104 lines)
- `src/components/ThemeSwitcher.tsx` (NEW — 82 lines)
- `src/index.css` (+381 lines of theme CSS variables)
- `src/App.tsx` (wrapped with ThemeProvider)
- `src/main.tsx` (ThemeContext import)

### 5 Available Themes

| Theme | Primary Color | Accent | Style |
|-------|--------------|--------|-------|
| Default | Navy blue (#1e3a5f) | Teal (#2d8a6e) | Professional |
| Ocean | Deep blue (#0c4a6e) | Sky blue (#0284c7) | Cool tones |
| Sunset | Amber (#92400e) | Orange (#ea580c) | Warm tones |
| Forest | Dark green (#14532d) | Emerald (#059669) | Nature |
| Royal | Deep purple (#4c1d95) | Violet (#7c3aed) | Regal |

### How It Works
1. `ThemeContext` reads the user's theme preference from their profile on login
2. Applies a CSS class (`theme-ocean`, `theme-sunset`, etc.) to the `<html>` element
3. All CSS uses CSS custom properties (`--primary`, `--accent`, `--sidebar`, etc.) that change per theme
4. Theme changes are persisted to the backend via `PATCH /profiles/me/preferences`
5. `ThemeSwitcher` component is available in both `DashboardLayout` and `AdminLayout` sidebars

### Dark Mode
Each theme also has dark mode variants. The dark mode toggle is independent of theme selection.

---

## 10. Frontend: Multi-Step Registration

**File:** `src/pages/AuthPage.tsx` (334+ lines changed)

### Before
Single-step registration form with basic fields (name, email, password, department, year).

### After
Two-step registration with animated transitions:

**Step 1 — Account & Academic Info:**
- First name, last name, email, password
- Department, degree, admission year, graduation year

**Step 2 — Professional & Social:**
- LinkedIn URL (required, with URL validation)
- GitHub URL (optional)
- Twitter/X URL (optional)
- Website URL (optional)
- Phone, city, current company, current role, bio

### UX Details
- Step progress indicator (colored bars showing 1/2 or 2/2)
- "Back" button on Step 2 to return to Step 1
- Client-side validation on Step 1 before allowing progress to Step 2
- `AnimatePresence` from Framer Motion for smooth step transitions
- All fields use proper `type` attributes (url, tel, email)
- `RegisterInput` interface in `AuthContext.tsx` updated to match

---

## 11. Frontend: Events Page Overhaul

**File:** `src/pages/EventsPage.tsx` (+186 lines)

### New Features
- **Server-side pagination** with `PAGE_SIZE=12` and Previous/Next controls
- **Department filter** dropdown with all 10 department options (matching backend constants)
- **Department badge** on event cards (colored tag)
- **Attachment indicator** (paperclip icon on cards with attachments)
- **Page resets to 1** on filter changes (upcoming toggle, search, department)
- **Attachment download** on event detail via presign-download endpoint
- **Past event badge** on event detail page

### Department Names Fixed
Frontend department list now matches backend `DEPARTMENTS` constant exactly:
- `"Mechanical"` → `"Mechanical Engineering"`
- `"Electrical"` → `"Electrical Engineering"`
- `"Civil"` → `"Civil Engineering"`
- `"Aerospace"` → `"Aeronautical Engineering"`
- `"CSE (IoT & Cyber)"` → `"CSE (IoT & Cyber Security)"`

---

## 12. Frontend: Jobs Page Overhaul

**File:** `src/pages/JobsPage.tsx` (+192 lines)

### New Features
- **Department filter** in search/filter area
- **Department badge** on job cards
- **Attachment indicator** (paperclip icon)
- **Attachment download** on job detail page
- Department names corrected to match backend constants (same fixes as Events)
- Responsive grid and dialog improvements

---

## 13. Frontend: Profile Page Enhancements

**File:** `src/pages/ProfilePage.tsx` (+40 lines)

### New Features
- **Twitter/X URL** field added to Profile interface and `WRITABLE_FIELDS`
- **Social links display** in view mode: LinkedIn (blue), GitHub (gray), Twitter/X (sky), Website (green) — all with appropriate icons and external link behavior
- **Edit mode fields** for GitHub URL, Twitter/X URL, Website URL

---

## 14. Frontend: Mobile Responsiveness

**Files:** `DashboardLayout.tsx`, `AdminLayout.tsx`, `EventsPage.tsx`, `JobsPage.tsx`, `AuthPage.tsx`, `UserApprovalsPage.tsx`, `EventDetailPage.tsx`, `JobDetailPage.tsx`

### Changes Applied Across All Pages
- Padding: `p-4 sm:p-6 lg:p-12`
- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Text sizes: `text-xl sm:text-2xl`
- Dialog footers: `flex-col sm:flex-row`
- Card layouts: stack on mobile, inline on desktop
- Sidebar: collapsible mobile drawer
- Tables: horizontal scroll on mobile
- Forms: full-width inputs on mobile, inline on desktop

---

## 15. Frontend: Admin User Approvals Page

**File:** `src/pages/admin/UserApprovalsPage.tsx` (+199 lines)

### New Features
- **Select all checkbox** (selects all visible users)
- **Individual row checkboxes**
- **Bulk approve button** — approves all selected users in one API call
- **Bulk reject button** — opens rejection reason dialog, then rejects all selected
- **Selection counter** showing "X selected"
- Uses `POST /api/v1/admin/users/bulk-status` endpoint
- Invalidates queries on success and clears selection

---

## 16. Bugs Fixed

### Bug 1: Route Ordering Conflict (admin.routes.ts)
**Problem:** `POST /users/bulk-status` was registered after `POST /users/:id/message`. Express matched `"bulk-status"` as an `:id` parameter, causing the request to hit the wrong handler (message endpoint) and fail with a validation error.
**Fix:** Moved `POST /users/bulk-status` before all `/:id` routes.

### Bug 2: Event Sort Order
**Problem:** All events sorted ascending by start date, so past events showed oldest first (events from years ago at the top).
**Fix:** `orderBy: { startsAt: q.upcoming ? "asc" : "desc" }` — upcoming events show soonest first, past events show most recent first.

### Bug 3: Department Name Mismatch
**Problem:** Frontend used shortened department names (`"Mechanical"`, `"Electrical"`, `"Civil"`, `"Aerospace"`) while backend constants used full names (`"Mechanical Engineering"`, `"Electrical Engineering"`, etc.). Department filtering and email targeting would never match.
**Fix:** Frontend department lists updated to use exact backend constant values.

### Bug 4: `VITE_API_BASE_URL` Used on Backend
**Problem:** `events.service.ts` used `process.env.VITE_API_BASE_URL` to construct email RSVP links. Vite environment variables are only available in the frontend build — they are never set on the backend server. In production, this would always fall back to `http://localhost:4000/api/v1`, producing broken RSVP links.
**Fix:** Replaced with `API_BASE_URL` env var (with fallback using `PORT`): `process.env.API_BASE_URL || \`http://localhost:${process.env.PORT || 4000}/api/v1\``

### Bug 5: Email RSVP Endpoint Missing Validation
**Problem:** `emailRsvpSchema` was defined in `events.validators.ts` but never applied to the `GET /:id/email-rsvp` route. The `response` query parameter was cast with `as` without validation, meaning any arbitrary string could be passed. `rsvpStatusMap[response]` would return `undefined` for invalid values, potentially writing `undefined` to the database.
**Fix:** Added `validate(emailRsvpSchema, "query")` middleware to the route. Only `YES`, `NO`, `NOT_SURE`, `MAYBE` are now accepted.

### Bug 6: Unused Variables in events.service.ts
**Problem:** `API_BASE` and `API_BACKEND` were declared but never used (dead code from iterative development).
**Fix:** Removed both. The RSVP URL construction now uses the `API_BASE_URL()` function.

### Bug 7: Mailer Transport Caching in Tests
**Problem:** The mailer's transport was cached as a module-level singleton. When tests changed `NODE_ENV` to `"development"` and re-imported the module, they got the cached `NoopTransport` instead of a `ConsoleTransport`. Tests for the console-logging behavior always failed.
**Fix:** Tests now call `_resetTransport()` before each test case to clear the cached transport, allowing the factory to select the correct transport based on the current `NODE_ENV`.

---

## 17. Security Fixes

### Fix 1: XSS Prevention in Email Templates (HIGH)
**Problem:** All user-controlled values (event titles, descriptions, applicant names, cover letters, locations, department names, etc.) were interpolated directly into HTML email templates without escaping. An attacker could inject malicious HTML/JavaScript through any of these fields. The `rsvpConfirmationHtml` function was especially dangerous as it returns HTML directly to the browser (not just email).

**Fix:** Added an `esc()` helper function:
```typescript
const esc = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};
```
Applied `esc()` to every user-controlled value in all 7 email templates and the HTML `<title>` tag in the shared wrapper.

**Values now escaped:**
- Event: title, description, location, department, recipientName
- Job: title, company, location, department, salaryRange, description, recipientName
- Application: jobTitle, company, applicantName, applicantEmail, applicantDepartment, applicantCompany, applicantRole, applicantLinkedin, coverLetter
- RSVP confirmation: eventTitle, response

---

## 18. Test Suite Updates

### New Test Files
| File | Tests | Coverage |
|------|-------|----------|
| `tests/lib/email-templates.test.ts` | 8 tests | All 7 template functions |
| `tests/jobs/eventReminders.test.ts` | 4 tests | Cron job: no events, reminders, non-responders, opt-out |

### Fixed Test Files

| File | Issue | Fix |
|------|-------|-----|
| `tests/integration/auth.routes.test.ts` | Registration payloads missing `linkedinUrl` → 422 instead of expected status | Added `linkedinUrl: "https://linkedin.com/in/..."` to all registration test payloads; added new test "422 when linkedinUrl is missing" |
| `tests/integration/admin.message.test.ts` | Mailer mock missing `sendBulkEmails` export → module import error | Added `sendBulkEmails: jest.fn()` to the mailer mock |
| `tests/integration/events.routes.test.ts` | Event create/update/delete tests used `userToken` but routes now require `requireAdmin` | Rewrote tests to use `adminToken` for admin-only operations; added new test "403 when non-admin tries to create"; removed invalid moderation test (events no longer have a separate moderate endpoint since creation is admin-only) |
| `tests/lib/mailer.test.ts` | Transport singleton cached across tests → dev branch never tested | Added `_resetTransport()` calls before each test case |
| `tests/helpers/prismaMock.ts` | Missing `donationLedgerEntry` model → `$transaction` callback failed with `undefined` | Added `"donationLedgerEntry"` to the `MODELS` array |

### Final Test Results
```
Test Suites: 48 passed, 48 total
Tests:       421 passed, 421 total
Snapshots:   0 total
```

---

## 19. Documentation Updates

**File:** `README.md`

### Changes
- **Features section** updated with comprehensive descriptions of all new features
- **Environment variables table** expanded with:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `API_BASE_URL` (used for email RSVP links)
- **Common Scripts table** updated with `npm test` and `npm run test:coverage`

---

## 20. File-by-File Change Summary

### New Files (6)

| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/lib/email-templates.ts` | 540 | 7 branded HTML email templates with XSS protection |
| `backend/src/jobs/eventReminders.ts` | 175 | Event reminder cron job (3 email types, 24h before) |
| `backend/prisma/migrations/20260630180000_.../migration.sql` | 16 | Schema migration for attachments, department, theme, email RSVP |
| `src/contexts/ThemeContext.tsx` | 104 | Theme state management + backend persistence |
| `src/components/ThemeSwitcher.tsx` | 82 | Theme picker dropdown UI |
| `backend/src/tests/lib/email-templates.test.ts` | 178 | Tests for all email templates |
| `backend/src/tests/jobs/eventReminders.test.ts` | 129 | Tests for event reminder cron |

### Modified Backend Files (20)

| File | Key Changes |
|------|-------------|
| `prisma/schema.prisma` | +EmailRsvpStatus enum, +twitterUrl, +theme, +attachmentKey, +department, +emailRsvpStatus |
| `src/lib/mailer.ts` | Full rewrite: stub → pluggable transport (Noop/Console/SMTP), +attachments, +bulk send |
| `src/config/constants.ts` | +`"event-attachment"`, `"job-attachment"` to UPLOAD_SCOPES |
| `src/server.ts` | +event reminder cron start/stop |
| `src/modules/events/events.service.ts` | +email notifications on create, +email RSVP handler, +department filter, sort order fix |
| `src/modules/events/events.controller.ts` | +emailRsvp handler |
| `src/modules/events/events.routes.ts` | +email-rsvp route with validation |
| `src/modules/events/events.validators.ts` | +attachmentKey, +department, +emailRsvpSchema, +department query filter |
| `src/modules/jobs/jobs.service.ts` | +rich application email with resume attachment, +department notifications on approval, +department filter |
| `src/modules/jobs/jobs.validators.ts` | +department query param |
| `src/modules/auth/auth.validators.ts` | +linkedinUrl (required), +githubUrl, +twitterUrl, +websiteUrl, +phone, +city, +bio, +currentCompany, +currentRole |
| `src/modules/auth/auth.service.ts` | +save Step 2 fields in profile create block |
| `src/modules/profiles/profiles.service.ts` | +twitterUrl in writable fields |
| `src/modules/profiles/profiles.validators.ts` | +twitterUrl validation |
| `src/modules/profiles/profiles.controller.ts` | Minor adjustments |
| `src/modules/profiles/profiles.routes.ts` | Minor adjustments |
| `src/modules/admin/admin.service.ts` | +bulkSetUserStatus() |
| `src/modules/admin/admin.controller.ts` | +bulkSetUserStatus handler |
| `src/modules/admin/admin.routes.ts` | +bulk-status route (before :id routes), route reordering |
| `src/modules/admin/admin.validators.ts` | +bulkStatusSchema |
| `src/storage/StorageService.ts` | Minor type adjustment |

### Modified Frontend Files (13)

| File | Key Changes |
|------|-------------|
| `src/App.tsx` | +ThemeProvider wrapper |
| `src/main.tsx` | +ThemeContext import |
| `src/index.css` | +381 lines: 5 theme CSS variables (default, ocean, sunset, forest, royal) with dark mode |
| `src/contexts/AuthContext.tsx` | +RegisterInput fields (linkedinUrl, githubUrl, twitterUrl, websiteUrl, etc.) |
| `src/pages/AuthPage.tsx` | Full rewrite: multi-step registration with animations |
| `src/pages/EventsPage.tsx` | +pagination, +department filter/badge, +attachment indicator, department names fixed |
| `src/pages/EventDetailPage.tsx` | +attachment download, +department badge, +past event badge, responsive |
| `src/pages/JobsPage.tsx` | +department filter/badge, +attachment indicator, department names fixed, responsive |
| `src/pages/JobDetailPage.tsx` | +attachment download, +department badge, responsive |
| `src/pages/ProfilePage.tsx` | +twitterUrl field, +social links display with icons |
| `src/pages/admin/UserApprovalsPage.tsx` | +select all, +bulk approve/reject, +selection counter |
| `src/components/DashboardLayout.tsx` | +ThemeSwitcher in sidebar, mobile responsive |
| `src/components/AdminLayout.tsx` | +ThemeSwitcher in sidebar, mobile responsive |

### Modified Test Files (6)

| File | Fix Applied |
|------|-------------|
| `tests/integration/auth.routes.test.ts` | +linkedinUrl in payloads, +missing linkedinUrl test |
| `tests/integration/admin.message.test.ts` | +sendBulkEmails in mailer mock |
| `tests/integration/events.routes.test.ts` | Rewrote for admin-only CRUD, removed invalid moderation test |
| `tests/lib/mailer.test.ts` | +_resetTransport() for transport cache issues |
| `tests/helpers/prismaMock.ts` | +donationLedgerEntry to MODELS array |
| `tests/lib/email-templates.test.ts` | Adjusted for HTML-escaped output |

---

_Generated on 2026-07-05_
