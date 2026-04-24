# ADCET Alumni Portal — Backend

Modular Node.js + Express + Prisma backend with JWT auth, RBAC, and pluggable storage.

## Folder structure
```
backend/
├── openapi.yaml              # HTTP contract (source of truth)
├── prisma/{schema.prisma, seed.ts}
├── docker-compose.yml        # Postgres + MinIO
├── .env.example
└── src/
    ├── server.ts             # Boot + graceful shutdown
    ├── app.ts                # Express composition
    ├── config/               # env, constants, openapi loader
    ├── lib/                  # prisma, logger, jwt, errors, password, pagination, asyncHandler
    ├── middlewares/          # auth, rbac, validate, errorHandler, notFound, rateLimit
    ├── storage/              # StorageService + S3Storage + LocalStorage + factory
    ├── routes/index.ts       # Mounts all module routers
    ├── types/express.d.ts
    └── modules/<name>/{routes,controller,service,validators}.ts
```

Modules: auth, users, profiles, events, jobs, achievements, donations,
alumni, geo, analytics, notifications, uploads, admin.

Each follows **routes → controller → service** with Zod validators.

## Role-based access
Roles in a separate `user_roles` table. Use `requireAuth` + `requireRoles("ADMIN")`.
Ownership checks via `isOwnerOrAdmin(req, ownerId)` inside services.

| Capability | Roles |
|---|---|
| Browse approved events/jobs/achievements | Anyone |
| Create event/achievement | ALUMNI, STUDENT (PENDING) |
| Create job posting | ALUMNI, RECRUITER (PENDING) |
| Apply, RSVP, donate, edit own profile | Authenticated |
| Approve users/events/jobs/achievements | ADMIN |
| Manage campaigns, mark donations RECEIVED | ADMIN |
| Audit log, reports, role assignment | ADMIN |

## Storage abstraction
`getStorage()` returns the active driver (`minio | s3 | local`) by env.
Swap providers by changing `STORAGE_DRIVER` — no code changes.

## Error handling
Throw typed errors from `lib/errors.ts`. Global `errorHandler` maps `ApiError`,
`ZodError`, Prisma `P2002`/`P2025` to `{ error: { code, message, details } }`.

## Run locally
```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```
- API:    http://localhost:4000/api/v1
- Docs:   http://localhost:4000/api/docs
- MinIO:  http://localhost:9001 (minioadmin / minioadmin)
- Admin:  admin@adcet.in / Admin@12345
