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

## Testing

Production-grade Jest suite with **two layers**:

1. **Unit tests** — pure service / middleware / lib logic, Prisma mocked via
   `createPrismaMock()`. Files under `src/tests/{lib,middlewares,modules}/`.
2. **Integration tests** — full Route → Middleware → Controller → Service flow
   exercised with `supertest` against `buildApp()`, with the Prisma client
   replaced by a `jest-mock-extended` deep mock (no live DB required). Files
   under `src/tests/integration/`.

Together they cover **281 tests** at ~82% statement coverage, including:
- Authentication / RBAC (401 on missing token, 403 when a non-admin hits an admin route)
- Validation failures (422 on malformed bodies / queries — drives `validators.ts`)
- Database failures mocked through Prisma (P2002 → 409, P2025 → 404, generic → 500)
- Resource-not-found paths (404 when an id is well-formed but absent)
- Side effects: notifications dispatched, audit log rows written, refresh-token rotation

```bash
# Run the whole suite (unit + integration)
npm test

# Watch mode (re-runs only changed files)
npm run test:watch

# Coverage report — text in stdout, lcov + HTML at ../coverage/
npm run test:coverage

# Target a single file, folder, or test name
npm test -- src/tests/modules/jobs
npm test -- src/tests/integration/auth.routes.test.ts
npm test -- -t "401 when the password is wrong"
```

### Conventions

- **No live DB.** Unit tests use `createPrismaMock()` at
  `src/tests/helpers/prismaMock.ts`; integration tests use
  `createPrismaDeepMock()` (a `jest-mock-extended` `DeepMockProxy<PrismaClient>`)
  exposed by `src/tests/helpers/integrationApp.ts`. Both reset between tests
  via Jest's global `clearMocks: true`.
- **ESM mocking.** Because the backend is native ESM, modules are stubbed with
  `jest.unstable_mockModule(path, factory)` *before* the dynamic
  `await import(...)` of the unit/app under test. The `NODE_OPTIONS=--experimental-vm-modules`
  flag is set automatically by `npm test`.
- **Forging auth tokens.** Integration tests use `makeToken({ sub, roles })` from
  `integrationApp.ts` to sign a real JWT with the test secret — exercising the
  actual `requireAuth` and `requireRoles` middleware end-to-end.
- **External I/O** (mailer, storage adapters, third-party OAuth providers) is
  mocked at the module boundary; no real network calls happen during `npm test`.
- **Adding a new module.** Drop a `<module>.routes.test.ts` under
  `src/tests/integration/` modeled on `auth.routes.test.ts`, and a service unit
  test under `src/tests/modules/<module>/`. List any new Prisma models in
  `prismaMock.ts`.

### Debugging failing tests

- Re-run a single suite with verbose output:
  `npm test -- src/tests/integration/jobs.routes.test.ts --verbose`
- Filter by test name (works across files):
  `npm test -- -t "403 when"`
- Print the actual response body when an assertion fails by adding
  `console.log(res.status, res.body)` in the failing test — supertest gives
  you the full HTTP response object.
- Inspect what Prisma was called with:
  `console.log(prisma.user.update.mock.calls)`.
- Step through with the Node inspector:
  `node --inspect-brk --experimental-vm-modules node_modules/.bin/jest --runInBand <file>`,
  then attach Chrome DevTools at `chrome://inspect`.
- Coverage gaps: open `../coverage/lcov-report/index.html` in a browser after
  `npm run test:coverage` to see uncovered lines highlighted per file.
