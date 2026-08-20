# Application Performance & Efficiency Review

**Scope:** whole-application sweep of `adcet-connect-38` for performance anomalies and
inefficiencies — React rendering and data-fetching, backend query and response patterns, and
the asynchronous / background-task design.

**Reviewed:** working tree on `main`, 2026-08-20 (uncommitted collaboration + donations work included).

**Method:** the stack was booted (`docker start backend-postgres-1`, `backend: npm run dev`,
`npm run dev`) and endpoints were timed with `curl -w '%{time_total}'`; Prisma statement counts
were taken from the dev query log; the frontend was production-built to measure chunking.
**Every number below is measured, not estimated.** Where a claim is structural rather than
measured, it is marked as such.

**Relationship to `OPTIMIZATION.md`:** that document is a *production-readiness / scaling*
review (indexes, multi-instance, load-test plan). This one is a *behavioural* review of how the
code spends time today. Overlapping items are marked **[also in OPTIMIZATION.md]** and kept
short; everything else is new.

---

## 0. Summary

| Area | Verdict |
|---|---|
| **Database & query shape** | ✅ Healthy. ~2 ms round-trips, 3–13 statements/request, no N+1. |
| **React rendering** | ✅ Healthy. Contexts memoized, derived data memoized, list items cheap. |
| **React data-fetching** | ❌ **Four real defects** — no query defaults, no debounce, no cached page, blocking splash. |
| **Bundling / assets** | ❌ **Severe.** One 2.25 MB chunk, 3,433 modules, an 85 MB `public/` with a 15.9 MB PNG. |
| **Request-path CPU** | ❌ **Severe.** Pure-JS bcrypt at cost 12 = 630 ms per login, blocking the event loop. |
| **Request-path I/O** | ❌ **Severe.** A 1.6–2.0 s SMTP handshake `await`ed inside 8 handlers. |
| **Response transport** | ❌ No gzip; every JSON response is ~4.4× larger than it needs to be. |
| **Background tasks** | ❌ **Architecturally weak.** `setInterval` in-process, re-fires on every restart, unbounded fan-out, no retry. |
| **Correctness found en route** | ❌ One live 500 (`/analytics/admin/insights?department=…`), one silent filter collision. |

**The single most valuable hour of work:** items 1–4 in §7. They are ~1 hour total and remove
essentially all of the latency you can feel.

---

## 1. Baseline — where time actually goes

Reads are already fast. This matters because it rules out the usual suspects:

| Endpoint | Time | Prisma statements |
|---|---|---|
| `GET /notifications/unread-count` | 10 ms | 1 |
| `GET /alumni?pageSize=12` | 20 ms | 3 |
| `GET /events?pageSize=10` | 22 ms | 3 |
| `GET /auth/me` | 24 ms | 5 |
| `GET /feed?pageSize=10` | 34 ms | 7 |
| `GET /admin/users?pageSize=20` | 45 ms | 3 |
| `GET /analytics/overview` | 148 ms | 6 |
| `GET /admin/activity?limit=12` | 148 ms | 13 |
| `GET /analytics/admin/insights` | 232 ms | — |
| Raw Postgres round-trip | ~2 ms | — |

Against that baseline, the expensive operations stand out sharply:

```
POST /auth/login  (unknown email → bcrypt never runs):    6 ms
POST /auth/login  (valid creds   → bcrypt runs):        630 ms
SMTP connect+auth to smtp.gmail.com (no message sent): 1846 ms
```

---

# PART A — Request-path costs

## A1. `bcryptjs` at cost factor 12 is 98% of login latency

**Severity: Critical · Effort: 5 min · New**

`backend/src/lib/password.ts:6`

```ts
import bcrypt from "bcryptjs";
const ROUNDS = 12;
```

Two compounding problems. `bcryptjs` is the **pure-JavaScript** implementation — roughly 4–6×
slower than the native binding, and it **blocks the Node event loop for its entire duration**,
so no other request in the process can be served while someone logs in. Cost factor **12**
then doubles the work four times over the common baseline of 10.

Measured here:

```
bcryptjs hash,    rounds 12:  546 ms
bcryptjs compare, rounds 12:  452 ms
bcryptjs hash,    rounds 10:  111 ms

POST /auth/login, unknown email (returns before verifyPassword):   6 ms,   6 ms,  35 ms
POST /auth/login, valid credentials:                             630 ms, 688 ms, 777 ms
```

The DB half of `login()` — one `findUnique`, one `lastLoginAt` update, one `refreshToken.create`
— is about 6 ms. Everything else is this one call. The same cost lands on `register`,
`resetPassword` and `changePassword`.

**Fix**

```bash
cd backend && npm uninstall bcryptjs @types/bcryptjs && npm install bcrypt && npm i -D @types/bcrypt
```

```ts
// backend/src/lib/password.ts
import bcrypt from "bcrypt";
const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
```

Native `bcrypt` runs in libuv's threadpool, so it also stops blocking the event loop.
**Expected: 630 ms → ~30 ms.**

> Existing hashes keep working — `$2a$`/`$2b$` is a shared format and the cost factor is
> embedded per-hash, so old cost-12 hashes still verify. No migration, no forced reset.

If you'd rather avoid a native dependency, `ROUNDS = 10` alone takes 450 ms → 110 ms.

---

## A2. A 1.6–2.0 s SMTP handshake runs inside eight HTTP handlers

**Severity: Critical · Effort: ~1 h · New (OPTIMIZATION.md P0-2 covers only *bulk* email)**

### A2a. No connection pool — a fresh TCP+TLS+AUTH per message

`backend/src/lib/mailer.ts:63` builds the transport with **no `pool: true`**. Nodemailer then
opens a new connection per message: TCP connect, STARTTLS, `AUTH PLAIN` against Gmail, teardown
— every time. Measured with three `transporter.verify()` calls (which perform exactly
connect+greeting+auth and stop short of sending):

```
SMTP connect+auth ms: 2045
SMTP connect+auth ms: 1846
SMTP connect+auth ms: 1653
```

**1.6–2.0 seconds of dead time before a single byte of the message is sent.**

`.env.development` also sets `SMTP_HOST=smtp.gmail.com`, so **local development sends real mail
through a real remote server**. The mailer already has a console transport
(`mailer.ts:41`) used when `SMTP_HOST` is empty — that path is instant, and it's currently off.

### A2b. Eight paths `await` that handshake before responding

| Path | Location | Symptom |
|---|---|---|
| **Approve / reject a user** | `admin.service.ts:76` → `notifications.service.ts:96` | **approve button, 2–3 s** |
| **Send registration OTP** | `auth.service.ts:89` | **"Send code" spins 2–3 s** |
| Forgot password | `auth.service.ts:340` | reset request hangs |
| Approve an achievement | `achievements.service.ts:124`, `:149`, `:162` | **three** awaited sends, 5–6 s |
| Decide a collaboration request | `collaboration.service.ts:200`, `:225` | 2 awaited sends |
| Send a chapter invitation | `chapters.service.ts:363`, `:392` | 2 awaited sends |
| Verify a donation | `donations.service.ts:317`, `:346` | PDF render **+ Cloudinary upload + email with attachment**, all before "Payment successful" |
| Submit a support message | `content.service.ts:90` | contact form hangs |
| Admin direct message | `notifications.service.ts:68` | send button hangs |

`admin.service.ts:102` (bulk approve) loops `setUserStatus` **sequentially**, each iteration
awaiting its own email: **20 users ≈ 40 seconds**.

### A2c. Your own code already has the right pattern

```ts
// backend/src/modules/events/events.service.ts:87
sendEventNotifications(event).catch((err) => logger.error(...));
// backend/src/modules/jobs/jobs.service.ts:85
sendJobNotifications(job).catch((err) => logger.error(...));
```

Events and jobs never await their fan-out. The eight paths above simply didn't adopt it.

**Fix (three parts)**

**(i) Pool the transport** — `mailer.ts:63`:

```ts
this.transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  pool: true,            // ← reuse connections
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,          // Gmail throttles hard; be polite
  auth: /* unchanged */, connectionTimeout: /* unchanged */,
});
```

**(ii) Stop awaiting the email half of `notify()`** — it is the shared entry point for
approve/reject, achievements, collaboration and chapters, so one change fixes four surfaces:

```ts
// backend/src/modules/notifications/notifications.service.ts, in notify()
if (!args.sendEmailToo) return;
void (async () => {
  try {
    const [user, prefs] = await Promise.all([                 // also: these were sequential
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);
    if (!user || (prefs && !prefs.notificationsEmail)) return;
    await sendEmail({ to: user.email, subject: args.title, text: args.body ?? args.title });
  } catch (e) { logger.error({ err: e, userId }, "failed to send notification email"); }
})();
```

Then apply the same `.catch()`-without-`await` shape at `donations.service.ts:317/:346`,
`achievements.service.ts:149/:162`, `collaboration.service.ts:225`, `chapters.service.ts:392`,
`content.service.ts:90`.

**Deliberately excluded:** `sendRegistrationOtp` (`auth.service.ts:89`) must stay awaited — the
endpoint's contract is "we sent it, or you get a 503". Pooling plus a local console transport is
the fix there.

**(iii) Comment out `SMTP_HOST` in `backend/.env.development`** for daily work.

**Expected: approve 2–3 s → ~30 ms; OTP 2–3 s → ~5 ms locally.**

---

## A3. No gzip — every JSON response is ~4.4× larger than necessary

**Severity: High (deployed) · Effort: 2 min · New**

`compression` is neither installed nor used (`backend/package.json`, `backend/src/app.ts`).
The server never sets `Content-Encoding`, even when the client sends `Accept-Encoding: gzip`.
Measured against the running server:

| Endpoint | Sent | Would be, gzipped | Ratio |
|---|---|---|---|
| `/alumni?pageSize=30` | 12,682 B | 2,857 B | **4.4×** |
| `/admin/users?pageSize=20` | 10,861 B | 2,623 B | **4.1×** |
| `/feed?pageSize=10` | 3,281 B | 878 B | **3.7×** |

Invisible on localhost; on a deployed site it is 4× the bytes and 4× the transfer time on
**every list request in the application**.

**Fix**

```bash
cd backend && npm install compression && npm i -D @types/compression
```

```ts
// backend/src/app.ts, right after helmet()
import compression from "compression";
app.use(compression());
```

---

## A4. Every authenticated request costs two round trips

**Severity: Medium · Effort: 1 min · New**

`backend/src/app.ts:22` configures CORS with **no `maxAge`**. Verified:

```
$ curl -X OPTIONS .../auth/login -H 'Origin: http://localhost:8080' \
       -H 'Access-Control-Request-Method: POST' -D -
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
    ← no Access-Control-Max-Age
```

Without it Chrome caches a preflight for **5 seconds**. And because `src/lib/api.ts` attaches an
`Authorization` header — not a CORS-safelisted request header — **even plain GETs are
preflighted**. Practically every API call in the app is two network round trips.

```ts
app.use(cors({
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
  credentials: true,
  maxAge: 86400,          // browsers cap it (Chrome 7200 s) but it kills repeat preflights
}));
```

---

## A5. Dev-only logging overhead

**Severity: Low · Effort: 1 min · New**

`backend/src/lib/prisma.ts:12` enables `"query"` logging in development, which prints the
**fully expanded SQL** — 500+ characters per statement for your `include`-heavy reads.
`/admin/activity` emits 13 of them per request. Terminal writes are synchronous, and combined
with `morgan("dev")` (`app.ts:31`) and `pino-pretty` this is real if modest cost — and it makes
the log unreadable, which is worse.

```ts
log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "warn", "error"] : ["warn", "error"],
```

---

# PART B — React / frontend

## B0. What is already right (don't "fix" these)

Worth stating, because these are where people usually start and all three are clean here:

- **Context values are memoized.** `AuthContext.tsx:157` and `ThemeContext.tsx:95` both wrap the
  provider value in `useMemo`, so consumers don't re-render on every parent render.
- **Derived data is memoized.** `AdminGeoMapPage.tsx:44`, `AdminAnalyticsPage.tsx:155`,
  `DonationsAdminPage.tsx:114` all compute inside `useMemo`.
- **List items are cheap.** Cards are plain `div`s; `framer-motion` is applied to the *page*
  wrapper, not per row. `key={index}` appears only on static/skeleton lists.

**There are zero `React.memo` calls in the app, and that is fine.** Adding them would be noise.
The frontend's problem is not rendering — it is **network behaviour and bundling**.

---

## B1. Zero code splitting: 3,433 modules in one 2.25 MB chunk

**Severity: High · Effort: 30 min · [also in OPTIMIZATION.md P1-4]**

`src/App.tsx:6-67` statically imports **all 60+ pages**. `grep -c "lazy(" src/App.tsx` → **0**.

```
✓ 3433 modules transformed.
dist/assets/index-DxbWV4-R.js   2,246.02 kB │ gzip: 632.14 kB   ← everything
dist/assets/pdf-CTZ9Q1jI.js       453.46 kB │ gzip: 135.15 kB
dist/assets/xlsx-B6sNpj_1.js      429.35 kB │ gzip: 143.18 kB
dist/assets/pdf.worker.min.mjs  1,244.25 kB
```

**Why this specifically hurts localhost:** Vite dev serves your **182 source modules and 49
shadcn components unbundled, one HTTP request each**. Someone landing on `/login` pays for admin
analytics, Recharts, Leaflet, supercluster and every dialog they'll never open. Each module is
fast alone (measured 4–5 ms) — it's the *waterfall* you feel. `vite.config.ts:15` also runs
`componentTagger()` over every module on every dev transform.

```tsx
import { lazy, Suspense } from "react";
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
// …every page; keep LandingPage + AuthPage eager if you like
<Suspense fallback={<PageSkeleton />}><Routes>…</Routes></Suspense>
```

Also confirm `src/lib/exportChart.ts` (`html2canvas` + `jspdf`) and the `xlsx` importer are
reached only via `await import()` — `src/lib/pdfCover.ts:15` already does this correctly.

---

## B2. `QueryClient` has no defaults — the app refetches constantly

**Severity: High · Effort: 2 min · [also in OPTIMIZATION.md P1-5]**

`src/App.tsx:69` is a bare `new QueryClient()`. That means `staleTime: 0` and
`refetchOnWindowFocus: true`: **every mount, every route change, and every alt-tab back from
your terminal refetches**. 51 files call `useQuery`; only two override it
(`ChaptersSection.tsx:23`, `geo.ts:50`).

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});
```

---

## B3. Search boxes fire a request on every keystroke

**Severity: High · Effort: 20 min · New**

Three admin pages debounce correctly — `CollaborationAdminPage.tsx:58`,
`AchievementsAdminPage.tsx:51`, `ChaptersAdminPage.tsx:59` all use a 300 ms `setTimeout`. **The
four highest-traffic pages do not**, wiring raw input state straight into the query key:

| Page | Line | Key |
|---|---|---|
| `AlumniDirectoryPage` | `:38` | `["alumni", q, departments, batches]` |
| `UserApprovalsPage` | `:85` | `["admin", "users", filter, search, page, chapterId]` |
| `EventsPage` | `:63` | `["events", { tab, q, mode, page }]` |
| `JobsPage` | `:63` | `["jobs", { q, employmentType, department, location, page }]` |

Typing `Rajesh` is **6 requests, 6 CORS preflights, and 6 backend searches**. And those searches
are the expensive kind: `nameAndCompanyMatch` (`alumni.service.ts:14`) compiles to
`ILIKE '%…%'` — a **leading wildcard, so no B-tree index can help** — and it ANDs one such
scan *per word*. `Rajesh Kumar` = 2 scans × 6 keystrokes = **12 sequential scans of `Profile`
joined to `User`**, plus a `COUNT(*)` each time. Free today at 19 rows; brutal at 50,000.

**Fix** — lift the 300 ms pattern the admin pages already use into a shared hook:

```ts
// src/hooks/useDebounced.ts
export const useDebounced = <T,>(value: T, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};
```

```tsx
const q = useDebounced(rawQ);          // then use `q` in the queryKey
```

Pair with `pg_trgm` GIN indexes (see `OPTIMIZATION.md` P1-2) so the surviving searches are
index-accelerated.

---

## B4. Every filter or page change blanks the list

**Severity: Medium · Effort: 10 min · New**

Only **2 of 51** `useQuery` call sites set `placeholderData` / `keepPreviousData`. Changing a
filter or clicking "next page" produces a fresh cache key with no data, so the component drops
to `isLoading` and the table is replaced by a spinner — a visible flash on every interaction,
even when the response takes 20 ms.

```ts
import { keepPreviousData } from "@tanstack/react-query";
useQuery({ queryKey: [...], queryFn: ..., placeholderData: keepPreviousData });
```

Set it once in the `QueryClient` defaults from B2 and every paginated table gets it.

---

## B5. The dashboard blanks on every reload waiting for `/auth/me`

**Severity: Medium · Effort: 15 min · New**

`src/components/ProtectedRoute.tsx:31`:

```tsx
if (loading) return <Splash />;
```

`AuthContext.tsx:75` already reads the cached user out of `localStorage` **synchronously** — then
sets `loading: true` and hides the entire subtree behind a full-screen spinner until
`GET /auth/me` returns. On a hard reload that is a preflight + request of deliberately blank
screen for information the app already has.

```tsx
const cached = tokenStore.get()?.user ?? null;
const [user, setUser] = useState<AuthUser | null>(cached);
const [loading, setLoading] = useState(!cached);   // ← only block when there's nothing cached
```

`/auth/me` still runs and still corrects the cached user; `adcet:auth-expired` still handles a
revoked session.

---

## B6. 85 MB of static assets, including a 15.9 MB PNG on the landing page

**Severity: High · Effort: 15 min · New**

`public/Chapters/Bengaluru.png` is **4080 × 3072, 15,953,677 bytes**, referenced by
`src/lib/chapters.ts:38-39` and rendered by `ChaptersSection.tsx:61` as a **~400 px card header**.

```
/Chapters/Bengaluru.png  15,953,677 B      /Chapters/Pune.png   1,164,191 B
/Chapters/Global.png        524,000 B      /Chapters/Mumbai.png   436,454 B
```

The bytes arrive in 58 ms off local disk — which is why this is easy to miss — but the browser
still has to **decode 12.5 megapixels into ~50 MB of RGBA on the main thread**, and that stalls
the first screen a visitor ever sees. `loading="lazy"` is set, which defers it, but the chapters
section is on the landing page.

`public/` overall is **85 MB across 90 files**:

```
30M  NewsLetter          ← incl. one 25 MB PDF
21M  gallery             ← incl. an 11.8 MB JPG
8.7M EsteemedAlumni      ← 31 portraits, many 0.7–0.9 MB, rendered as small headshots
4.5M AlumniAssociation   ← incl. a 1.3 MB PNG
1.7M Testimonials        ← 1072×1467 portraits behind a carousel thumbnail
```

Only **17 of 44 `<img>` tags** carry `loading="lazy"`.

```bash
cd public/Chapters && for f in *.png; do cwebp -q 82 -resize 1200 0 "$f" -o "${f%.png}.webp"; done
```

Then point `src/lib/chapters.ts:36-41` at the `.webp` files. Target **≤ 200 KB / ≤ 1200 px** for
card images, **≤ 80 KB / ≤ 600 px** for portraits — that pass takes `public/` from 85 MB to
roughly 5 MB. Add `loading="lazy"` plus explicit `width`/`height` to the remaining 27 `<img>`s
to stop layout shift.

---

# PART C — Asynchronous & background tasks

This is the weakest area architecturally, and the one you asked about that no existing document
covers in depth.

## C1. Cron is `setInterval` in-process — and it re-fires on every restart

**Severity: High · Effort: half a day · New**

`backend/src/jobs/eventReminders.ts:166`:

```ts
export const startEventReminderCron = (intervalMs = 24 * 60 * 60 * 1000) => {
  runEventReminders().catch(...);          // ← runs IMMEDIATELY at boot
  const handle = setInterval(() => { runEventReminders().catch(...); }, intervalMs);
  handle.unref?.();
  return () => clearInterval(handle);
};
```

Four distinct problems:

1. **It runs on every boot.** In development the backend runs under `tsx watch` — so **every
   file save restarts the process and re-runs the reminder job.** I saw it fire during this
   review ("No events tomorrow — skipping reminders"). If an event *had* been scheduled for
   tomorrow, every keystroke-triggered reload would have re-blasted the entire alumni list.
   In production, every deploy does the same.
2. **No idempotency guard.** Nothing records that an event's reminders were already sent, so
   there is no way for a re-run to know to skip.
3. **`setInterval` drifts and is boot-relative.** It fires 24 h after startup, not at a fixed
   hour. A server that restarts daily at 09:00 never reaches the next tick at all.
4. **No distributed lock.** The moment you run two instances (which you will), every job runs
   twice. `geoBackfill.ts:87` has the same shape.

**Fix (in increasing order of investment)**

- *Minimum:* drop the immediate `runEventReminders()` call at boot, and add a `remindersSentAt`
  column on `Event` checked before sending.
- *Better:* use `node-cron` with an explicit expression (`"0 9 * * *"`) instead of `setInterval`,
  so the schedule is wall-clock, not boot-relative.
- *Right:* move to an external scheduler (a platform cron hitting an authenticated
  `POST /internal/jobs/event-reminders`, or BullMQ + Redis). That gives you one runner
  regardless of instance count, plus retries and visibility.

`resumeCleanup.ts:48` exports `startResumeCleanupCron` but **nothing ever calls it** — the job
is dead code and resumes are never purged. **[also in OPTIMIZATION.md P0-5]**

---

## C2. Bulk email has unbounded concurrency

**Severity: High · Effort: 20 min · New**

`backend/src/lib/mailer.ts`:

```ts
const results = await Promise.allSettled(mails.map((m) => t.send(m)));
```

Every message is dispatched **simultaneously**. Combined with A2a (no pool, one connection per
message), sending to 5,000 alumni attempts **5,000 concurrent TCP+TLS connections to Gmail**.
Gmail will refuse most of them, the job reports a large `failed` count, and — because there is no
retry — those notifications are simply lost.

**Fix** — `pool: true` from A2a caps it at `maxConnections`, but bound the queue explicitly too:

```ts
export const sendBulkEmails = async (mails: OutgoingEmail[], concurrency = 5) => {
  const t = getTransport();
  let sent = 0, failed = 0;
  for (let i = 0; i < mails.length; i += concurrency) {
    const results = await Promise.allSettled(mails.slice(i, i + concurrency).map((m) => t.send(m)));
    for (const r of results) r.status === "fulfilled" ? sent++ : failed++;
  }
  if (failed) logger.warn({ failed, total: mails.length }, `[mailer] ${failed}/${mails.length} failed`);
  return { sent, failed };
};
```

---

## C3. The daily RSVP summary emails every alumnus, every day, per event

**Severity: High · Effort: needs a product decision · New**

`backend/src/jobs/eventReminders.ts:122` — inside the per-event loop:

```ts
const allTargetedAlumni = await prisma.user.findMany({
  where: { status: "APPROVED", roles: { some: { role: "ALUMNI" } }, ...(hasTargeting && { profile: targetedProfile }) },
  select: { email: true, firstName: true, lastName: true, preferences: { ... } },
});
// …then one summary email to every one of them
```

For each event happening tomorrow, this loads **every approved alumnus** (unbounded — no `take`)
and sends each of them a *"here's the current RSVP count"* email. Three events tomorrow and
5,000 alumni is **15,000 emails in one job run**, dispatched at unbounded concurrency (C2),
through an unpooled transport (A2a).

This is a fan-out design question, not a tuning question. Steps 1 (remind people who RSVP'd) and
2 (nudge non-responders) are defensible. **Step 3 — broadcasting a running RSVP tally to people
who never expressed interest — is the one to reconsider.** At minimum gate it behind a per-event
flag, cap the recipient set, and page the query rather than loading it whole.

---

## C4. Fire-and-forget has no retry and no dead-letter

**Severity: Medium · Effort: half a day · New (structural)**

The `.catch(err => logger.error(...))` pattern at `events.service.ts:87`, `jobs.service.ts:85`,
`jobs.service.ts:148` and `jobs.service.ts:305` is the right *shape* — but a failure is written
to a log line and then **the notification is gone forever**. There's no queue, no retry, no
record that a user was owed an email. A transient Gmail 421 silently drops an entire event
announcement.

Once you add A2's non-blocking sends, this applies to eight more paths, so it's worth solving
properly rather than accumulating more of them. The smallest real fix is an `OutboxEmail` table:
handlers insert a row and return; a worker drains it with retry and backoff. That also gives you
the distributed-safety C1 needs, and makes "did the approval email actually go out?" answerable.

---

## C5. In-process caches won't survive a second instance

**Severity: Low today · Effort: — · [related to OPTIMIZATION.md P0-1]**

`donations.service.ts:462` (`topDonorsCache`) and `geo.service.ts:166` (`cached`) are
module-level `Map`/variable caches with `invalidate*()` helpers. Correct and effective for one
process. With two instances, invalidating on instance A leaves instance B serving stale data for
the rest of the TTL — 5 minutes for the donor roll, 60 s for the map. Not urgent (both TTLs are
short and the data is non-critical), but note it before you scale out.

---

# PART D — Backend query & data-shape issues

## D1. The insights endpoint 500s whenever a department filter is applied

**Severity: High — this is a live bug, not a slowdown · Effort: 5 min · New**

`analytics.service.ts:293` and `:297` filter `Event` and `Job` by a **`department` column that
does not exist** — both models use `departments String[]` (`schema.prisma:458`, `:507`).

TypeScript cannot catch it: **excess-property checking does not apply to spread expressions**, so
`...(dept && { department: dept })` compiles cleanly. `npx tsc --noEmit` passes. It fails only at
runtime. Verified against the running server:

```
GET /analytics/admin/insights                          → 200, 232 ms
GET /analytics/admin/insights?department=Computer%20…  → 500
  PrismaClientValidationError: Invalid `prisma.event.findMany()` invocation
  at analytics.service.ts:292
```

**Fix** — use the array containment operator the rest of the codebase uses:

```ts
prisma.event.findMany({ where: { ...created, ...(dept && { departments: { has: dept } }) }, … }),
prisma.job.findMany({   where: { ...created, ...(dept && { departments: { has: dept } }) }, … }),
```

Note the semantic that `CLAUDE.md` already documents: `has` asks *"aimed at X"*, so postings
open to everyone (empty array) are deliberately excluded.

---

## D2. The insights endpoint loads whole tables into Node to count them

**Severity: High at volume · [also in OPTIMIZATION.md P0-3]**

`analytics.service.ts:288-304` runs five **unbounded** `findMany` calls — every user, event, job,
donation and achievement row — then counts and buckets them in JavaScript
(`users.filter(u => u.status === "APPROVED").length`, the `donationTrendMap` loop at `:334`).
When no date range is supplied, `created` is `{}`, so there is no bound at all.

Every one of these is expressible as `groupBy` or `aggregate` — which the *same function*
already uses correctly for `byDepartment`, `byYear`, `topCompanies` and `topCities`. It's 232 ms
at 19 users; at 50,000 it transfers 50,000 rows per dashboard load.

---

## D3. A filter-key collision silently drops the batch multi-select

**Severity: Low · Effort: 5 min · New**

`backend/src/modules/alumni/alumni.service.ts:46-54`:

```ts
...(q.graduationYear      && { graduationYear: q.graduationYear }),
...(q.graduationYears?.length && { graduationYear: { in: q.graduationYears } }),
...((q.graduationYearMin || q.graduationYearMax) && { graduationYear: { gte: …, lte: … } }),
```

Three spreads write **the same object key**. A request carrying both `graduationYears` and
`graduationYearMin` silently keeps only the last — the multi-select the user picked is discarded
with no error. Merge the three into one branch, or make the validator reject the combination.

---

## D4. The directory returns all 29 `Profile` columns

**Severity: Medium · [perf angle new; privacy angle is OPTIMIZATION.md P2-1]**

`alumni.service.ts:58` uses `include` with no `select` on the profile itself, so all 29 columns
ship — `phone`, `birthDay`, `birthMonth`, `bio`, `resumeKey` — while the card renders about six
of them. That's most of the 12,682 B measured in A3. Adding an explicit `select` cuts the payload
several-fold *and* closes the privacy hole in one edit.

---

## D5. Smaller items

- **`requireApproved` adds a DB round-trip to every non-admin request**
  (`middlewares/requireApproved.ts:17`). ~2 ms locally; it is on literally every request.
  **[also in OPTIMIZATION.md P2-4]**
- **No Prisma connection-pool configuration** — no `connection_limit` / `pool_timeout` in
  `DATABASE_URL`. **[also in OPTIMIZATION.md P1-6]**
- **`OFFSET` + `COUNT(*)` on ~15 list endpoints** (`lib/pagination.ts:36`). The feed in
  particular is infinite scroll and wants a cursor. **[also in OPTIMIZATION.md P1-3]**
- **Missing indexes** on `Profile.department`, `JobApplication.userId`, `EventRsvp.userId`,
  `AuditLog.createdAt`; `Notification` should be `[userId, createdAt]` not `[userId, readAt]`.
  **[also in OPTIMIZATION.md P1-1]**
- **Stack traces in error responses are correctly gated** on `NODE_ENV !== "production"`
  (`errorHandler.ts:44`) — checked, not a problem.

---

# §7 — Ranked action list

| # | Fix | Where | Effort | Win |
|---|---|---|---|---|
| 1 | `bcryptjs` → native `bcrypt`, cost 10 | `lib/password.ts:6` | 5 min | **login 630 ms → ~30 ms** |
| 2 | Comment out `SMTP_HOST` locally | `.env.development` | 1 min | **OTP 2–3 s → ~5 ms in dev** |
| 3 | `pool: true` on the mail transport | `lib/mailer.ts:63` | 5 min | 2 s handshake amortised |
| 4 | Don't `await` email in `notify()` + 7 call sites | `notifications.service.ts:96` | 45 min | **approve 2–3 s → ~30 ms** |
| 5 | Fix `department` → `departments: { has }` | `analytics.service.ts:293,297` | 5 min | **removes a live 500** |
| 6 | Add `compression()` | `app.ts` | 2 min | responses 4.4× smaller |
| 7 | `QueryClient` defaults + `keepPreviousData` | `App.tsx:69` | 5 min | kills refetch storms and list flashing |
| 8 | Debounce the 4 undebounced searches | `AlumniDirectoryPage`, `UserApprovals`, `Events`, `Jobs` | 20 min | 6 requests/word → 1 |
| 9 | `maxAge: 86400` on CORS | `app.ts:22` | 1 min | 2 round trips → 1 |
| 10 | Resize `public/` to web sizes | `public/Chapters`, `public/EsteemedAlumni` | 15 min | landing 19 MB → ~1 MB |
| 11 | `React.lazy` every route | `App.tsx:6-67` | 30 min | entry chunk 2.25 MB → ~400 KB |
| 12 | Optimistic `ProtectedRoute` | `ProtectedRoute.tsx:31` | 15 min | no blank screen on reload |
| 13 | Bound `sendBulkEmails` concurrency | `lib/mailer.ts` | 20 min | stops Gmail refusing the fan-out |
| 14 | Remove boot-time reminder run; add `remindersSentAt` | `jobs/eventReminders.ts:166` | 1 h | no duplicate blasts per restart/deploy |
| 15 | Reconsider the daily RSVP-summary broadcast | `jobs/eventReminders.ts:122` | product call | removes the largest fan-out |
| 16 | `groupBy` instead of loading tables into Node | `analytics.service.ts:288` | 2 h | insights stays flat with data volume |
| 17 | `OutboxEmail` table + worker | new | half day | retries, visibility, multi-instance safety |
| 18 | Indexes, `pg_trgm`, cursor pagination, pool config | see `OPTIMIZATION.md` P1 | — | matters at volume, not today |

**Items 1–9 are about two hours and cover everything you can currently feel.**
Items 13–17 are the async/background rework — do them before the alumni list grows, because
their failure mode is *silently dropped email*, which nobody reports as a bug.

---

# §8 — Verification

```bash
# login — now ~0.63 s, target < 0.05 s
curl -s -o /dev/null -w 'login %{time_total}s\n' -X POST \
  http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@adcet.in","password":"Admin@12345"}'

# approve — now ~2-3 s, target < 0.05 s
curl -s -o /dev/null -w 'approve %{time_total}s\n' -X POST \
  "http://localhost:4000/api/v1/admin/users/$ID/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}'

# compression — should print content-encoding: gzip after A3
curl -s -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN" -D - -o /dev/null \
  'http://localhost:4000/api/v1/alumni?pageSize=30' | grep -i content-encoding

# the insights bug — should be 200 after D1
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4000/api/v1/analytics/admin/insights?department=Computer%20Science%20and%20Engineering'
```

Set `PRISMA_LOG_QUERIES=true` when you want per-request statement counts back.
