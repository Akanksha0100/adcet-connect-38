<h1 align="center">
  <img src="public/logo.png" alt="ADCET Alumni Portal" height="60" width="60" />
  <br />
  ADCET Alumni Portal
</h1>

<div align="center">

[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red?style=for-the-badge)](#license)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-Development-yellow?style=for-the-badge)](https://github.com/Akanksha0100/adcet-connect-38)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen?style=for-the-badge)](https://github.com/Akanksha0100/adcet-connect-38/actions)
[![Issues](https://img.shields.io/badge/Issues-Welcome-brightgreen?style=for-the-badge)](https://github.com/Akanksha0100/adcet-connect-38/issues)
[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)](https://github.com/Akanksha0100/adcet-connect-38/releases)
[![ADCET](https://img.shields.io/badge/ADCET-Adcet%20College-orange?style=for-the-badge&logoColor=white)](https://adcet.ac.in)

</div>

<p align="center">
  A full-stack alumni engagement platform for ADCET — directory, events, jobs,
  achievements, donations, geo insights, and an admin moderation suite — built
  with role-based access control end-to-end.
</p>

> **Status**: Active development · **License**: Proprietary (see [License](#license))

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Local Setup](#local-setup)
6. [Seeded Accounts](#seeded-accounts)
7. [Environment Variables](#environment-variables)
8. [Common Scripts](#common-scripts)
9. [Going to Production](#going-to-production)
10. [License](#license)

---

## Features

- **Authentication & RBAC** — JWT access + refresh tokens, four roles
  (`ADMIN`, `ALUMNI`, `STUDENT`, `RECRUITER`), roles stored in a separate
  table to prevent privilege escalation. Multi-step registration with
  LinkedIn (required), GitHub, Twitter/X, and website URLs.
- **Alumni Directory** with filters (department, year, company, city).
- **5 Themes** — Default, Ocean, Sunset, Forest, Royal — with dark mode toggle.
  Persisted per-user in the database.
- **Fully Responsive** — mobile-first design across all pages, dialogs, and admin views.
- **Events** — admin-only creation with department targeting, file attachments
  (PDF/image/doc), email notifications with in-email RSVP (Yes/Maybe/Not Sure/No),
  meeting URL for online events, capacity tracking, and automatic reminders
  1 day before events (to interested users and non-responders).
- **Jobs Board** — any user can post (admin approves), department-targeted email
  notifications on approval, file attachments, rich application flow with resume
  upload and cover letter, email to poster with applicant info + resume attachment.
- **Achievements** — submission + moderation pipeline.
- **Donations** — campaigns, pledges, status tracking, proof upload, ledger.
- **Geo Insights** — alumni distribution by city × company.
- **Admin Suite** — user approvals with pagination, select-all, bulk approve/reject,
  event/job/achievement moderation, analytics, reports (CSV/JSON), audit log.
- **Pagination** — server-side pagination on all list views (events, jobs, users,
  achievements, donations), default sort by latest first.
- **Email Notifications** — branded HTML emails for events, jobs, applications,
  RSVP confirmations, and moderation actions. SMTP configurable via env vars.
- **Pluggable Storage** — MinIO (dev) → S3 (prod) via a single env switch.

## Tech Stack

| Layer | Stack |
|------|------|
| Frontend | Vite · React 18 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Framer Motion |
| Backend | Node.js · Express · TypeScript · Prisma · Zod · Pino |
| Database | PostgreSQL 16 |
| Storage | MinIO (S3-compatible) — swappable to AWS S3 |
| Infra (dev) | Docker Compose |

## Project Structure

```
.
├── src/                  # Frontend (Vite + React)
│   ├── pages/            # Route-level pages (user + admin)
│   ├── components/       # Shared UI + layout shells
│   ├── contexts/         # AuthContext
│   └── lib/api.ts        # Typed API client (auth + refresh)
├── backend/              # Express + Prisma backend
│   ├── prisma/           # schema.prisma + seed.ts
│   ├── src/modules/      # Feature modules (routes/controller/service)
│   ├── src/middlewares/  # auth, rbac, validate, errorHandler
│   ├── src/storage/      # Pluggable storage (S3/Local)
│   └── docker-compose.yml
└── docs/                 # Architectural notes
```

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10 (or `bun`)
- **Docker** + **Docker Compose** (for Postgres & MinIO)
- A free TCP port `4000` (API), `5173`/`8080` (frontend), `5432` (Postgres), `9000-9001` (MinIO)

## Local Setup

### 1. Clone & install

```bash
git clone <repo-url> adcet-alumni
cd adcet-alumni

# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Start infrastructure (Postgres + MinIO)

```bash
cd backend
docker compose up -d
```

This brings up:
- **Postgres** on `localhost:5432` (db: `adcet`, user: `adcet`, password: `adcet`)
- **MinIO** on `localhost:9000` (console at `localhost:9001`, creds: `minioadmin` / `minioadmin`)

### 3. Initialize the database & seed

```bash
# from /backend
npm run prisma:migrate -- --name init   # first time only
npm run seed                            # idempotent — safe to re-run
```

The seed creates **1 admin + 6 users** (alumni / student / recruiter) with
realistic interconnected data: profiles, jobs, events, achievements,
donations, RSVPs, and applications.

### 4. Run the apps

In **two terminals**:

```bash
# Terminal 1 — backend
cd backend
npm run dev            # http://localhost:4000/api/v1  (docs at /api/docs)

# Terminal 2 — frontend (from project root)
npm run dev            # http://localhost:8080
```

Open http://localhost:8080 and sign in.

## Seeded Accounts

| Role      | Email                  | Password      |
|-----------|------------------------|---------------|
| Admin     | `admin@adcet.in`       | `Admin@12345` |
| Alumni    | `alice@adcet.in`       | `Alumni@123`  |
| Alumni    | `bob@adcet.in`         | `Alumni@123`  |
| Alumni    | `priya@adcet.in`       | `Alumni@123`  |
| Alumni    | `rahul@adcet.in`       | `Alumni@123`  |

Each user owns different content (jobs, events, achievements, donations,
RSVPs) so all admin and user views render with realistic data out of the box.

## Environment Variables

Two env files at the project root for the frontend, two in `backend/`.

### Frontend — `.env` (copy from `.env.example`)

| Variable | Default | Purpose |
|---------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:4000/api/v1` | Backend API URL |

### Backend — `backend/.env.development` (used by `npm run dev` / `npm run seed`)

| Variable | Default | Purpose |
|---------|---------|---------|
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` | `4000` | API port |
| `DATABASE_URL` | `postgresql://adcet:adcet@localhost:5432/adcet` | Postgres connection |
| `JWT_ACCESS_SECRET` | _dev value_ | Access-token signing key |
| `JWT_REFRESH_SECRET` | _dev value_ | Refresh-token signing key |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed frontend origin |
| `API_BASE_URL` | `http://localhost:4000/api/v1` | Public API URL (used in email RSVP links) |
| `STORAGE_DRIVER` | `minio` | `minio` \| `s3` \| `local` |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `S3_BUCKET` | `adcet` | Default bucket |
| `S3_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `S3_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `SMTP_HOST` | _(empty)_ | SMTP host for sending emails (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Use TLS for SMTP |
| `SMTP_USER` | _(empty)_ | SMTP username |
| `SMTP_PASS` | _(empty)_ | SMTP password |
| `SMTP_FROM` | _(empty)_ | From address for outgoing emails |

### Backend — `backend/.env.production`

Same keys, but with **production** values: managed Postgres URL, real S3
bucket/credentials, strong JWT secrets, and your public frontend origin.
**Never commit production secrets** — use your platform's secret manager.

## Common Scripts

### Frontend (project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on `:8080` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API in watch mode (loads `.env.development`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server (uses ambient env) |
| `npm run prisma:migrate` | Create + apply a dev migration |
| `npm run prisma:deploy` | Apply pending migrations (prod) |
| `npm run prisma:studio` | Browse data in Prisma Studio |
| `npm run seed` | Idempotent dev seed |
| `npm run db:setup` | Migrate + seed in one go |
| `npm test` | Run all Jest tests |
| `npm run test:coverage` | Run tests with coverage report |

## Going to Production

The codebase is **environment-driven** — switching from local to production
requires only:

1. **Build both apps**
   ```bash
   npm run build              # frontend → dist/
   cd backend && npm run build # backend → dist/
   ```
2. **Provision Postgres + S3** (managed services recommended).
3. **Set production env vars** (see `backend/.env.production`):
   - `DATABASE_URL` → managed Postgres
   - `STORAGE_DRIVER=s3`, `S3_*` → AWS S3
   - `JWT_*_SECRET` → long random strings (≥ 64 chars)
   - `CORS_ORIGIN` → your real frontend domain
   - `VITE_API_BASE_URL` → your real API domain (rebuild frontend)
4. **Apply migrations**
   ```bash
   npm run prisma:deploy
   ```
5. **Start** the API (`npm run start`) behind a reverse proxy / process
   manager. Serve the frontend `dist/` from any static host or CDN.

No code changes are required to switch environments.

## License

**Proprietary — All Rights Reserved.**

Copyright © 2026 Annasaheb Dange College of Engineering & Technology, Ashta (ADCET).

This software and its source code are the confidential and proprietary
information of ADCET. No part of this repository may be copied, modified,
distributed, sublicensed, sold, or used in any form, in whole or in part,
without the prior written consent of ADCET.

contact: [ADCET — Alumni Portal Team](mailto:rrg_mech@adcet.in).