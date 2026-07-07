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
- **Pluggable storage**: `backend/src/storage/` has a `StorageService` interface with `LocalStorage` / `S3Storage` (MinIO in dev, S3 in prod) adapters, selected by `STORAGE_DRIVER` env var. Never call S3 SDK directly from modules — go through the storage service.
- **Background jobs**: `backend/src/jobs/` (event reminders, resume cleanup) are cron loops started in `server.ts` and stopped on graceful shutdown.
- **Email**: `lib/mailer.ts` + `lib/email-templates.ts` (branded HTML). Events/jobs send department-targeted emails; event emails contain token-signed RSVP links handled by the **public** `GET /events/:id/email-rsvp` endpoint (JWT in query params, no session).

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
