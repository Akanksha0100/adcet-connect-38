# ADCET Alumni Portal - Detailed Change Report

**Base Commit:** `f0d9c36` — _fix: cv upload problem feat: admin access to job posts, donation scrshot_
**Report Date:** 2026-07-06
**Scope:** 52 files changed, +4,241 lines / -467 lines

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database & Schema Changes](#2-database--schema-changes)
3. [Backend: Email System](#3-backend-email-system)
4. [Backend: Event Features](#4-backend-event-features)
5. [Backend: Job Features](#5-backend-job-features)
6. [Backend: Registration Step 2](#6-backend-registration-step-2)
7. [Backend: Admin Module](#7-backend-admin-module)
8. [Backend: Event Reminder Cron](#8-backend-event-reminder-cron)
9. [Frontend: Theme System](#9-frontend-theme-system)
10. [Frontend: Multi-Step Registration](#10-frontend-multi-step-registration)
11. [Frontend: Events Page](#11-frontend-events-page)
12. [Frontend: Jobs Page](#12-frontend-jobs-page)
13. [Frontend: Admin User Management](#13-frontend-admin-user-management)
14. [Frontend: Admin Job Management](#14-frontend-admin-job-management)
15. [Frontend: Profile Page](#15-frontend-profile-page)
16. [Frontend: Mobile Responsiveness](#16-frontend-mobile-responsiveness)
17. [Environment Configuration](#17-environment-configuration)
18. [Bugs Fixed](#18-bugs-fixed)
19. [Security Fixes](#19-security-fixes)
20. [Test Suite](#20-test-suite)
21. [File-by-File Summary](#21-file-by-file-summary)

---

## 1. Overview

This release transforms the application from a basic CRUD portal into a production-ready alumni engagement platform. Key additions:

- **Full email notification system** with branded HTML templates, SMTP transport, and in-email RSVP
- **Event reminders** via daily cron job (3 email types sent 24h before events)
- **Department-targeted notifications** for both events and jobs
- **File attachments** on events and jobs (upload + download via presigned URLs)
- **Multi-step registration** with LinkedIn (required) + social links
- **5 switchable themes** with dark mode, persisted per-user
- **Admin job creation** with auto-approval and notifications
- **Enhanced user management** — admin can manage ALL users (not just pending), with message, approve, reject actions
- **Comprehensive mobile responsiveness** across all pages

### Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Test Suites | 46 | 48 (all passing) |
| Tests | ~400 | 421 (all passing) |
| Email Templates | 0 | 7 branded HTML |
| Background Jobs | resume cleanup | + event reminders cron |
| Themes | 1 | 5 + dark mode |
| Registration Steps | 1 | 2 |
| Admin Job Actions | moderate only | create + moderate |
| Admin User Actions | approve/reject pending only | approve/reject/message ANY user |

---

## 2. Database & Schema Changes

**Migration:** `20260630180000_add_attachments_department_theme_emailrsvp`

### New Enum
```prisma
enum EmailRsvpStatus { YES, NO, NOT_SURE, MAYBE }
```

### Model Changes

| Model | Field | Type | Purpose |
|-------|-------|------|---------|
| `Profile` | `twitterUrl` | `String?` | Twitter/X profile URL |
| `UserPreferences` | `theme` | `String` (default `"default"`) | Persisted theme per user |
| `Event` | `attachmentKey` | `String?` | S3/MinIO key for file attachment |
| `Event` | `department` | `String?` | Target department for notifications |
| `EventRsvp` | `emailRsvpStatus` | `EmailRsvpStatus?` | Exact email RSVP response |
| `Job` | `attachmentKey` | `String?` | S3/MinIO key for file attachment |
| `Job` | `department` | `String?` | Department for notifications |

---

## 3. Backend: Email System

### Mailer Rewrite (`backend/src/lib/mailer.ts`)

**Before:** Simple stub that logged to console in dev, no-op in tests. No SMTP, no attachments, no bulk send.

**After:** Full pluggable transport architecture:

| Transport | When Used | Behavior |
|-----------|-----------|----------|
| `NoopTransport` | `NODE_ENV=test` | Silent no-op |
| `ConsoleTransport` | No `SMTP_HOST` | Pretty-prints emails to terminal |
| `SmtpTransport` | `SMTP_HOST` set | Real SMTP via Nodemailer |

**New capabilities:**
- `EmailAttachment` support (filename, content, path, contentType)
- `sendBulkEmails()` — sends individually, `Promise.allSettled()` for partial failure tolerance
- `_resetTransport()` for testing
- `to` accepts `string | string[]`

### Email Templates (`backend/src/lib/email-templates.ts` — NEW, 540 lines)

7 branded HTML templates with consistent header/footer, ADCET branding, and **XSS protection** via `esc()` helper:

| Template | Purpose |
|----------|---------|
| `eventNotificationEmail()` | New event with RSVP buttons (Yes/Maybe/Not Sure/No) |
| `eventReminderEmail()` | "Tomorrow" reminder for GOING/INTERESTED users |
| `eventNonResponderReminderEmail()` | "Last chance" nudge for non-responders |
| `eventRsvpSummaryEmail()` | RSVP count summary |
| `jobNotificationEmail()` | New job opportunity for dept alumni |
| `jobApplicationEmail()` | Application details + resume for job poster |
| `rsvpConfirmationHtml()` | HTML page returned after email RSVP click |

---

## 4. Backend: Event Features

### Email Notifications with In-Email RSVP
When admin creates an event:
1. Event auto-approved (admin-only creation)
2. Async email to all alumni in targeted department (or all if no department)
3. Each email has 4 personalized RSVP buttons: Yes, Maybe, Not Sure, No
4. Buttons are signed JWT links → `GET /events/:id/email-rsvp?token=...&response=YES`

**New endpoint:** `GET /api/v1/events/:id/email-rsvp`
- Public (token-based auth via signed JWT in query params)
- Validates via `emailRsvpSchema` (token + response enum)
- Records RSVP via upsert, returns branded HTML confirmation page

### Event Sort Order Fix
- **Before:** All events sorted ascending (oldest first for past events)
- **After:** Upcoming = ascending (soonest first), Past = descending (most recent first)

### Department Filter
Events list now accepts `?department=CSE` query parameter.

---

## 5. Backend: Job Features

### Admin Auto-Approval (`jobs.service.ts`)
**Before:** All jobs created with `status: PENDING` regardless of creator.
**After:** Admin-created jobs are auto-approved (`status: APPROVED`) and immediately trigger department notifications.

```typescript
export const create = async (caller, data) => {
  const status = isAdmin(caller) ? "APPROVED" : "PENDING";
  const job = await prisma.job.create({ data: { ...data, createdById: caller.sub, status } });
  if (status === "APPROVED") {
    sendJobNotifications(job).catch(err => logger.error(...));
  }
  return job;
};
```

### Department-Targeted Notifications
When a job is approved (or auto-approved by admin):
- Finds all approved alumni in the job's department (or all alumni if no department)
- Filters out users who opted out of email notifications
- Sends branded HTML emails via `sendBulkEmails()`

### Rich Application Emails
When someone applies:
- Fetches full applicant profile (department, grad year, company, role, LinkedIn)
- Sends branded HTML email to job poster with all details
- Attaches resume PDF via presigned download URL

### Department Filter
Jobs list now accepts `?department=CSE` query parameter.

---

## 6. Backend: Registration Step 2

### Validator (`auth.validators.ts`)
New fields in `registerSchema`:

| Field | Required? | Validation |
|-------|-----------|-----------|
| `linkedinUrl` | **Yes** | Min 1, max 500, valid URL |
| `githubUrl` | No | Max 500, valid URL |
| `twitterUrl` | No | Max 500, valid URL |
| `websiteUrl` | No | Max 500, valid URL |
| `phone` | No | Max 40 chars |
| `city` | No | Max 120 chars |
| `bio` | No | Max 2000 chars |
| `currentCompany` | No | Max 160 chars |
| `currentRole` | No | Max 160 chars |

### Service (`auth.service.ts`)
All new fields saved in the `profile.create` block during registration.

---

## 7. Backend: Admin Module

### Bulk User Status
**Endpoint:** `POST /api/v1/admin/users/bulk-status`
- Accepts `{ userIds: string[], status: "APPROVED"|"REJECTED", reason?: string }`
- Processes sequentially (partial success possible)
- Each user gets audit log entry + notification

### Route Ordering Fix
`POST /users/bulk-status` moved **before** all `/:id` routes to prevent Express matching `"bulk-status"` as `:id`.

### Admin Direct Message
`POST /api/v1/admin/users/:id/message` — sends a notification + optional email to any user.

---

## 8. Backend: Event Reminder Cron

**File:** `backend/src/jobs/eventReminders.ts` (NEW, 175 lines)

Runs on server startup + every 24 hours. For APPROVED events starting in 24-48 hours:

| Email Type | Recipients | Template |
|-----------|------------|----------|
| Reminder | GOING/INTERESTED RSVP users | `eventReminderEmail()` |
| Non-responder nudge | Alumni who haven't RSVP'd | `eventNonResponderReminderEmail()` |
| RSVP summary | All dept alumni | `eventRsvpSummaryEmail()` |

Respects `notificationsEmail` preference. Returns stats: `{ eventsProcessed, remindersSent, nonResponderRemindersSent }`.

---

## 9. Frontend: Theme System

### New Files
- `src/contexts/ThemeContext.tsx` (104 lines) — state management + backend persistence
- `src/components/ThemeSwitcher.tsx` (82 lines) — dropdown picker

### 5 Themes

| Theme | Primary | Accent |
|-------|---------|--------|
| Default | Navy (#1e3a5f) | Teal (#2d8a6e) |
| Ocean | Deep blue (#0c4a6e) | Sky (#0284c7) |
| Sunset | Amber (#92400e) | Orange (#ea580c) |
| Forest | Dark green (#14532d) | Emerald (#059669) |
| Royal | Deep purple (#4c1d95) | Violet (#7c3aed) |

Each has dark mode variants. Theme CSS class applied to `<html>`, persisted to backend via `PATCH /profiles/me/preferences`.

---

## 10. Frontend: Multi-Step Registration

**File:** `src/pages/AuthPage.tsx` (full rewrite)

**Step 1:** Name, email, password, department, degree, years
**Step 2:** LinkedIn (required), GitHub, Twitter/X, Website, phone, city, company, role, bio

Features: animated step transitions, progress indicator, back button, client-side validation before step 2.

---

## 11. Frontend: Events Page

### Event Creation Dialog (Admin Only)
Complete form with:
- Title, description, dates, location, capacity, online toggle + meeting URL
- **Department selector** (10 departments matching backend constants)
- **File attachment upload** (PDF/image/doc via presigned URL)
- Helper text: "Email notifications will be sent to alumni in this department"

### Event List
- Server-side pagination (PAGE_SIZE=12)
- Department badge on cards
- Attachment indicator (paperclip icon)
- Department filter dropdown
- Mode filter (online/offline)

### Event Detail
- Attachment download button (via presign-download endpoint)
- Department badge
- Past event badge

---

## 12. Frontend: Jobs Page

### Job Creation Dialog (All Users)
Complete form with:
- Title, company, location, vacancies, employment type
- **Department selector**
- **File attachment upload** (PDF/image/doc)
- For admin: auto-approved with notifications
- For users: submitted as PENDING for admin review

### Job List
- Department filter
- Department badge on cards
- Attachment indicator
- Server-side pagination

---

## 13. Frontend: Admin User Management

**File:** `src/pages/admin/UserApprovalsPage.tsx` (full rewrite)

### Before
- Title: "User Approvals"
- Checkboxes only shown for PENDING users
- Actions (approve/reject) only for PENDING users
- Select all only selected pending users
- No messaging capability

### After
- Title: "User Management"
- **Checkboxes for ALL users** regardless of status
- **Select all on page** selects every visible user
- **Context-appropriate actions for every user:**
  - Non-approved users → Approve button
  - Non-rejected users → Reject button (with reason dialog)
  - All users → Message button (opens compose dialog)
- **Bulk actions:** Approve Selected, Reject Selected (with reason dialog), Clear
- Bulk actions show contextually (e.g., "Approve" hidden if all selected are already approved)
- **Direct Message dialog** — subject + body, sends notification + email
- Status badges with icons (ShieldCheck for approved, ShieldX for rejected, RotateCcw for pending)
- Total user count in pagination

### Use Cases Now Supported
| Scenario | How |
|----------|-----|
| Approve pending user | Click Approve on card |
| Bulk approve all pending | Filter→Pending, Select All, Approve Selected |
| Reject/ban an approved user | Click Reject on their card, enter reason |
| Re-approve a rejected user | Click Approve on their card |
| Message any user | Click Message, compose subject + body |
| Bulk reject multiple users | Select users, Reject Selected, enter reason |

---

## 14. Frontend: Admin Job Management

**File:** `src/pages/admin/JobApprovalsPage.tsx`

### New: "Create Job" Button
Admin can now create jobs directly from the admin panel with a full form:
- Title, company, location, vacancies
- Employment type (Full-time, Part-time, Internship, Contract)
- Remote toggle
- **Department selector** (notifications go to this department's alumni)
- **File attachment upload** (PDF/image/doc)
- Description

Admin-created jobs are **auto-approved** and immediately trigger email notifications to targeted alumni. The button says "Create & Notify" and the dialog title says "Create Job (Auto-Approved)".

### Existing: Moderation
- Approve/reject pending jobs with reason dialog
- View all applicants with details + resume download
- Filter by status, company, location, employment type

---

## 15. Frontend: Profile Page

- Added `twitterUrl` field to Profile interface and writable fields
- Social links display: LinkedIn (blue), GitHub (gray), Twitter/X (sky), Website (green) with icons
- Edit mode fields for all social URLs

---

## 16. Frontend: Mobile Responsiveness

Applied across all pages:
- Responsive padding: `p-4 sm:p-6 lg:p-12`
- Responsive grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Responsive text: `text-xl sm:text-2xl`
- Dialog footers: `flex-col sm:flex-row`
- Collapsible mobile sidebar drawers
- Full-width inputs on mobile

---

## 17. Environment Configuration

### `backend/.env.development` — New Variables Added

```env
# Email / SMTP
SMTP_HOST=           # Empty = console-only transport (emails printed to terminal)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ADCET Alumni Portal" <noreply@adcet.in>

# API Base URL (used in email RSVP links)
API_BASE_URL=http://localhost:4000/api/v1
```

### `backend/.env.example` — Complete Update
Updated to include all env vars: SMTP config, API_BASE_URL, OAuth settings, with documentation comments.

### How Email Works in Dev
With `SMTP_HOST` empty (default), emails are **printed to the terminal** in a formatted block:
```
────────── EMAIL ──────────
To: alice@adcet.in
Subject: 📅 New Event: Reunion — ADCET Alumni
[email body]
──────────────────────────
```

To enable real email delivery, set `SMTP_HOST` to your SMTP server (e.g., `smtp.gmail.com` for Gmail, or use [Mailtrap](https://mailtrap.io) for testing).

---

## 18. Bugs Fixed

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | Admin route `POST /users/bulk-status` shadowed by `POST /users/:id/message` | Medium | Moved bulk-status before `:id` routes |
| 2 | Past events sorted oldest-first | Medium | `orderBy: { startsAt: q.upcoming ? "asc" : "desc" }` |
| 3 | Frontend department names didn't match backend constants | Medium | Updated to exact backend values |
| 4 | `VITE_API_BASE_URL` used on backend (not available server-side) | Medium | Replaced with `API_BASE_URL` env var |
| 5 | `emailRsvpSchema` defined but never applied to route | Medium | Added `validate(emailRsvpSchema, "query")` |
| 6 | Dead variables `API_BASE` and `API_BACKEND` in events.service.ts | Low | Removed |
| 7 | Mailer transport cached across test cases | Low | Tests call `_resetTransport()` |
| 8 | Admin-created jobs status was PENDING (required self-approval) | Medium | Auto-approve + notify when admin creates |
| 9 | User management limited to pending users only | Medium | Rewrote to manage ALL users |
| 10 | No admin job creation capability | Medium | Added Create Job dialog to admin panel |
| 11 | Missing SMTP/API env vars in .env files | Medium | Added to .env.development and .env.example |

---

## 19. Security Fixes

### XSS Prevention in Email Templates (HIGH)
All user-controlled values escaped with `esc()` helper before HTML interpolation:
```typescript
const esc = (s: string | null | undefined): string => {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};
```
Applied to: event titles, descriptions, locations, departments, applicant names, emails, cover letters, company names, RSVP confirmations, and the shared HTML `<title>` tag.

---

## 20. Test Suite

### Final Results
```
Test Suites: 48 passed, 48 total
Tests:       421 passed, 421 total
```

### New Test Files
| File | Tests | Coverage |
|------|-------|----------|
| `tests/lib/email-templates.test.ts` | 8 | All 7 template functions |
| `tests/jobs/eventReminders.test.ts` | 4 | Cron job scenarios + opt-out |

### Fixed Tests
| File | Fix |
|------|-----|
| `auth.routes.test.ts` | Added `linkedinUrl` to payloads + new validation test |
| `admin.message.test.ts` | Added `sendBulkEmails` to mailer mock |
| `events.routes.test.ts` | Updated for admin-only CRUD |
| `mailer.test.ts` | Use `_resetTransport()` |
| `prismaMock.ts` | Added `donationLedgerEntry` to MODELS |
| `email-templates.test.ts` | Adjusted for HTML-escaped output |

---

## 21. File-by-File Summary

### New Files (7)

| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/lib/email-templates.ts` | 540 | 7 branded HTML email templates with XSS protection |
| `backend/src/jobs/eventReminders.ts` | 175 | Event reminder cron job |
| `backend/prisma/migrations/20260630180000_.../migration.sql` | 16 | Schema migration |
| `src/contexts/ThemeContext.tsx` | 104 | Theme state + backend persistence |
| `src/components/ThemeSwitcher.tsx` | 82 | Theme picker UI |
| `backend/src/tests/lib/email-templates.test.ts` | 178 | Email template tests |
| `backend/src/tests/jobs/eventReminders.test.ts` | 129 | Cron job tests |

### Modified Backend Files (21)

| File | Key Changes |
|------|-------------|
| `prisma/schema.prisma` | +EmailRsvpStatus, +twitterUrl, +theme, +attachmentKey, +department, +emailRsvpStatus |
| `src/lib/mailer.ts` | Full rewrite: pluggable transport, attachments, bulk send |
| `src/config/constants.ts` | +event-attachment, +job-attachment upload scopes |
| `src/server.ts` | +event reminder cron |
| `src/modules/events/events.service.ts` | +email notifications, +email RSVP handler, +dept filter, sort fix |
| `src/modules/events/events.controller.ts` | +emailRsvp handler |
| `src/modules/events/events.routes.ts` | +email-rsvp route with validation |
| `src/modules/events/events.validators.ts` | +attachmentKey, +department, +emailRsvpSchema |
| `src/modules/jobs/jobs.service.ts` | **+admin auto-approval**, +rich application email, +dept notifications |
| `src/modules/jobs/jobs.validators.ts` | +department query param |
| `src/modules/auth/auth.validators.ts` | +linkedinUrl (required), +social links, +profile fields |
| `src/modules/auth/auth.service.ts` | +save Step 2 fields |
| `src/modules/profiles/*.ts` | +twitterUrl support |
| `src/modules/admin/admin.service.ts` | +bulkSetUserStatus() |
| `src/modules/admin/admin.controller.ts` | +bulkSetUserStatus handler |
| `src/modules/admin/admin.routes.ts` | +bulk-status route (before :id), route reordering |
| `src/modules/admin/admin.validators.ts` | +bulkStatusSchema |
| `.env.development` | **+SMTP_*, +API_BASE_URL** |
| `.env.example` | **Complete rewrite with all env vars + docs** |

### Modified Frontend Files (14)

| File | Key Changes |
|------|-------------|
| `src/App.tsx` | +ThemeProvider wrapper |
| `src/main.tsx` | +ThemeContext import |
| `src/index.css` | +381 lines: 5 theme CSS variables with dark mode |
| `src/contexts/AuthContext.tsx` | +RegisterInput fields |
| `src/pages/AuthPage.tsx` | **Full rewrite**: multi-step registration |
| `src/pages/EventsPage.tsx` | +pagination, +dept filter/badge, +attachment, dept names fixed |
| `src/pages/EventDetailPage.tsx` | +attachment download, +dept badge, responsive |
| `src/pages/JobsPage.tsx` | +dept filter/badge, +attachment upload, dept names fixed |
| `src/pages/JobDetailPage.tsx` | +attachment download, +dept badge, responsive |
| `src/pages/ProfilePage.tsx` | +twitterUrl, +social links |
| `src/pages/admin/UserApprovalsPage.tsx` | **Full rewrite**: manage ALL users, +message, +bulk actions |
| `src/pages/admin/JobApprovalsPage.tsx` | **+Create Job dialog** with dept + attachment + auto-approval |
| `src/components/DashboardLayout.tsx` | +ThemeSwitcher, mobile responsive |
| `src/components/AdminLayout.tsx` | +ThemeSwitcher, mobile responsive |

---

_Generated on 2026-07-06_
