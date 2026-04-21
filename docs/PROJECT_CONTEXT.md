# ADCET Alumni Portal — Project Context

## Intent
A web portal for ADCET (engineering college) connecting **Alumni, Current Students, Admins, and Recruiters**. The frontend is a React + Vite + Tailwind SPA, currently using static dummy data. This document captures the product surface so the backend stays consistent with it.

## Target users & roles
- **alumni** — graduated students, full profile, can post jobs/achievements/donations.
- **student** — current students, limited write access.
- **admin** — moderates users, events, jobs, achievements; views analytics & reports.
- **recruiter** — external; can post jobs (subject to approval).

## Modules (mapped from frontend pages)
| Frontend page | Backend module | Notes |
|---|---|---|
| `AuthPage` | `auth` | Register/login (email+password), LinkedIn/GitHub OAuth (stubbed), JWT access+refresh |
| `ProfilePage` | `profiles` | Alumni profile: education, work, social, avatar |
| `DashboardHome` / `AnalyticsPage` | `analytics` | Aggregate counts for charts |
| `EventsPage` / `EventApprovalsPage` | `events` | CRUD + RSVP + approval workflow |
| `JobsPage` / `JobApprovalsPage` | `jobs` | CRUD + apply + vacancies + approval |
| `AchievementsPage` / `AchievementsAdminPage` | `achievements` | Post + moderate alumni achievements |
| `DonationsPage` / `DonationsAdminPage` | `donations` | Campaigns + pledges + receipts |
| `AlumniDirectoryPage` | `alumni` | Search/filter directory |
| `GeoMapPage` / `AdminGeoMapPage` | `geo` | City + company aggregates |
| `UserApprovalsPage` | `admin` | Pending registrations |
| `ReportsPage` | `admin` | Generate exports |
| `SettingsPage` | `users` | Profile + preferences (notifications, dark mode) |
| File uploads (avatar, event images, receipts) | `uploads` | Pre-signed URLs against MinIO/S3 |

## Cross-cutting concerns
- **Auth**: JWT (access 15m + refresh 7d). Roles in a join table `user_roles` (no role on the user row — prevents privilege escalation).
- **Approval workflow**: `status` enum on Event/Job/Achievement/Donation/User: `PENDING | APPROVED | REJECTED`.
- **Storage**: Abstracted behind `StorageService` interface. Default: MinIO (S3-compatible). Swap by changing env (`STORAGE_DRIVER=s3|minio|local`).
- **Validation**: zod schemas, shared between routes & OpenAPI generation.
- **Pagination**: `?page=&pageSize=` everywhere lists are returned.

## Source-of-truth files
- `backend/prisma/schema.prisma` — database schema
- `backend/openapi.yaml` — HTTP contract
- Both files are the contract between frontend & backend. Keep them in sync.

## Out of scope for this pass
- Real OAuth provider config (LinkedIn/GitHub) — endpoints exist, return 501.
- Email/SMS sending — `notifications` module exposes interface; no provider wired.
- Payment gateway for donations — only records pledges.

## Run locally
See `backend/README.md`.