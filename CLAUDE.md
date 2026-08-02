# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Full-stack alumni engagement platform for ADCET. It is a **monorepo with two independent apps**:

- **Frontend** (repo root, `src/`) — Vite + React 18 + TypeScript SPA.
- **Backend** (`backend/`) — Express + Prisma + PostgreSQL REST API, versioned under `/api/v1`.

The two apps have **separate `package.json` files, separate dependencies, and separate test runners** (Vitest for frontend, Jest for backend). Run their commands from their respective directories.

## Commands

### Frontend (run from repo root)
```bash
npm run dev            # Vite dev server on http://localhost:8080
npm run build          # production build → dist/
npm run lint           # ESLint
npm test               # vitest run (all tests once)
npm run test:watch     # vitest in watch mode
npx vitest run src/path/to/file.test.tsx   # run a single test file
```

### Backend (run from `backend/`)
```bash
npm run dev            # tsx watch, loads .env.development, API on :4000
npm run build          # tsc → dist/
npm run seed           # idempotent dev seed
npm run db:setup       # migrate (--name init) + seed
npm run db:reset       # reset DB + reseed (destructive)
npm run prisma:migrate # create + apply a dev migration
npm run prisma:studio  # browse data
npm test               # jest --runInBand (all tests)
npx jest src/tests/path/to/file.test.ts    # run a single test file
```

Backend npm scripts inject env via `dotenv -e .env.development`. Running `tsx`/`prisma` directly will **not** load env vars — use the npm scripts. Tests run under `NODE_ENV=test` with `--experimental-vm-modules` (ESM).

Both apps run at once in two terminals: backend on `:4000`, frontend on `:8080` (proxies to the API via `VITE_API_BASE_URL`). Swagger UI is at `http://localhost:4000/api/docs`.

## Backend architecture

**Modular monolith.** Every feature is a self-contained module in `backend/src/modules/<name>/` following a strict layered convention:

```
<name>.routes.ts       # Express router: mounts middleware chain + controllers
<name>.controller.ts   # thin HTTP layer: parse req → call service → send res
<name>.service.ts      # all business logic + Prisma calls live here
<name>.validators.ts   # Zod schemas for request bodies/queries
```

Adding a feature = create the module folder, then add one import + one `apiRouter.use(...)` line in `backend/src/routes/index.ts`. Modules never import each other's routers; shared logic goes in `backend/src/lib/`.

Key conventions:
- **App vs. server split**: `app.ts` is pure Express wiring (importable in tests, no `listen`); `server.ts` boots it and starts background cron jobs. Don't add business logic to either.
- **Middleware chain order** (see any `*.routes.ts`): `requireAuth` → `requireAdmin`/`requireRoles(...)` → `requireApproved` → `validate(schema, "query"|"body")` → `asyncHandler(ctrl.fn)`. All async controllers must be wrapped in `asyncHandler` so errors reach the global handler.
- **Errors**: throw the helpers from `lib/errors.ts` (`Unauthorized()`, `Forbidden()`, `NotFound()`, etc.) — never `res.status(...).json` for errors. `middlewares/errorHandler.ts` maps `ApiError`, `ZodError`, and Prisma errors (P2002→409, P2025→404) to responses centrally.
- **RBAC**: four roles (`ADMIN`, `ALUMNI`, `STUDENT`, `RECRUITER`) stored in a **separate `UserRole` table**, not a column on `User`, to prevent privilege escalation. Use `requireRoles(...)` (OR semantics) or `isOwnerOrAdmin(req, ownerId)` from `middlewares/rbac.ts`.
- **Pluggable storage**: `backend/src/storage/` has a `StorageService` interface with `LocalStorage` / `S3Storage` (MinIO in dev, S3 in prod) / `CloudinaryStorage` adapters, selected by `STORAGE_DRIVER` env var. Never call a provider SDK directly from modules — go through the storage service. Uploads are always browser → storage; `presignUpload()` returns either a `PUT` URL (S3 family) or `method: "POST"` + signed multipart `fields` (Cloudinary), and the frontend's `src/lib/upload.ts` handles both. `CloudinaryStorage` derives resource type and public id from the object key's extension; `src/lib/storage.ts` mirrors that mapping to build delivery URLs client-side — keep the two in sync.
- **Departments**: the 10 official ADCET department names live in `config/constants.ts` (`DEPARTMENTS`), mirrored verbatim by `src/lib/departments.ts` on the frontend — `src/tests/lib/departments.test.ts` fails if the two drift. Every **write** path (sign-up, profile PATCH, event, job) validates with `departmentSchema` / `optionalDepartmentSchema` from `lib/departments.ts`, so the column can never hold free text again; **read** filters use the lenient `departmentFilterSchema` so a stale value narrows results instead of 400ing. Frontend dropdowns render `DEPARTMENTS` (or `DEPARTMENT_FILTER_OPTIONS`, which prepends `"All"` — always strip `"All"` before sending). Migration `20260803093000_rename_departments` rewrote the old abbreviations and free-text spellings; don't reintroduce them.
- **Sign-up requires a full profile**: `registerSchema` makes department, degree, graduation year, birthday, phone, city, current company and current role all mandatory alongside name/email/password/LinkedIn. Two things are deliberately *not* collected: the **admission year** (derived via `admissionYearFor(degree, graduationYear)` — B.E./B.Tech is 4 years, M.E./M.Tech is 2, from `DEGREES` in `config/constants.ts`) and the **birth year** (only `birthDay` + `birthMonth`, for birthday wishes). `DegreeType` has just `BE` and `ME`; PHD/DIPLOMA were dropped.
- **SSO never bypasses onboarding or approval**: `loginWithOAuth` creates new users **always PENDING** — a provider-verified email proves address ownership, not ADCET alumni status — with an empty profile. `publicUser` reports `profileComplete` (from `lib/profileCompletion.ts`), and the frontend's `ProtectedRoute` redirects anyone incomplete (admins excepted) to `/complete-profile`, which posts to `POST /auth/complete-profile`. That endpoint reuses the very same `requiredProfileFields` object as `registerSchema`, so an SSO user cannot skip a field form sign-up demands; a test asserts `REQUIRED_PROFILE_FIELDS` and that object stay in step. Completing a profile never changes approval status.
- **Emails are case-insensitive identities**: every email field flows through `emailSchema` in `auth.validators.ts`, which trims and lowercases at the validator boundary, and `loginWithOAuth` does the same to provider-supplied addresses. The DB has both a `User.email` unique constraint and a `lower(email)` unique index, and `register` catches P2002 as a 409 — the pre-flight lookup alone can't survive two concurrent sign-ups.
- **Background jobs**: `backend/src/jobs/` (event reminders, resume cleanup) are cron loops started in `server.ts` and stopped on graceful shutdown.
- **Email**: `lib/mailer.ts` + `lib/email-templates.ts` (branded HTML). Events/jobs send department-targeted emails; event emails contain token-signed RSVP links handled by the **public** `GET /events/:id/email-rsvp` endpoint (JWT in query params, no session).
- **Chapters** (`modules/chapters/`): regional alumni communities (Pune/Mumbai/Bangalore seeded by migration + `DEFAULT_CHAPTERS` in `config/constants.ts`). Four rules the code depends on:
  - **Invite-only membership** — there is deliberately no self-service join anywhere. An admin creates a `ChapterInvitation`; the alumnus becomes a member only when they accept, either in the portal or via the signed one-click links in the invitation email (public `GET /chapters/invitations/email-respond`, same token pattern as event RSVPs). Inviting must never grant membership — a test asserts this.
  - **One chapter per member** — membership is a single `Profile.chapterId`, not a join table, so accepting an invite repoints it and moves them out of any previous chapter (the email and confirm dialog say so). `updateProfileSchema` deliberately omits `chapterId` so it can't be set via a profile PATCH.
  - **Delete only while empty** — `DELETE /chapters/:id` succeeds only with zero members and zero events; otherwise it 409s and tells the admin to archive instead (`isActive: false`), which keeps members, events and history but hides the chapter and closes it to new invitations.
  - **Targeting is AND** — `Event.chapterId` and `Event.department` are both optional narrowing filters on notifications, intersected (`{ department, chapterId }` on the profile relation). Chapter never affects event *visibility*, only who gets emailed. `jobs/eventReminders.ts` mirrors the same clause so reminders reach the same audience.

Prisma schema and `seed.ts` live in `backend/prisma/`. After changing `schema.prisma`, run `npm run prisma:migrate`.

## Frontend architecture

- **Routing** (`src/App.tsx`): all routes declared in one file. Three tiers:
  - Public routes (landing, login, static pages).
  - `/dashboard/*` — wrapped in `<ProtectedRoute>` (any logged-in role) → `<DashboardLayout>` → `<AccountStatusGate>` (blocks non-approved users).
  - `/admin/*` — wrapped in `<ProtectedRoute roles={["ADMIN"]}>` → `<AdminLayout>`.
- **API client** (`src/lib/api.ts`): the single typed gateway to the backend. Framework-agnostic (no React imports). Persists JWTs in `localStorage` under `adcet.tokens`, auto-attaches the bearer token, and on 401 **transparently refreshes once and retries**. On hard auth failure it clears tokens and dispatches an `adcet:auth-expired` event that `AuthContext` listens for to sign out. Add new endpoints here rather than calling `fetch` from components.
- **State**: `AuthContext` (auth/session) and `ThemeContext` (5 themes + dark mode, persisted per-user in DB) in `src/contexts/`. Server state uses TanStack Query; there is no global store like Redux.
- **UI**: shadcn/ui components in `src/components/ui/` (generated — see `components.json`; regenerate rather than hand-editing). Styling is Tailwind. `@/` path alias maps to `src/`.

## Notes

- This is a **proprietary, internal** project; external PRs are not accepted (see `CONTRIBUTING.md`).
- The `/api/v1/assistant/chat` endpoint is an intentional placeholder — no LLM is wired up.
- Seeded dev accounts (after `npm run seed`): admin `admin@adcet.in` / `Admin@12345`; alumni e.g. `alice@adcet.in` / `Alumni@123`. Full list in `README.md`.
