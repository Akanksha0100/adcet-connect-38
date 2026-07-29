# Email delivery & registration OTP — what changed and how to roll it back

**Date:** 2026-07-29
**Affected flow:** Sign-up step 2 → "Next: Verify Email" → step 3 (6-digit code)

---

## TL;DR

Sign-up hung on the deployed site because **Render's free tier blocks outbound SMTP**, so
Gmail could never be reached. We made the failure fast and visible, and added a
**temporary, opt-in** escape hatch (`EXPOSE_OTP_ON_MAIL_FAILURE`) that returns the OTP in
the API response so sign-up is testable with no working mail transport.

To go back to Gmail: **set `EXPOSE_OTP_ON_MAIL_FAILURE=false`** — that's it. Gmail's config
was never removed. But Gmail will only actually deliver from a host that permits outbound
SMTP (see [Going back to Gmail](#going-back-to-gmail)).

---

## The problem

Clicking **Next: Verify Email** spun for ~2 minutes, never advanced to the OTP step, and no
email arrived.

Probing the deployed backend directly showed it:

```
$ curl -X POST https://adcet-connect-38.onrender.com/api/v1/auth/register/send-otp \
       -H 'Content-Type: application/json' -d '{"email":"...@example.com"}'

{"error":{"code":"INTERNAL","message":"Internal server error"}}
status: 500 in 122.471249s
```

### Why

Since **26 September 2025, Render blocks outbound traffic to SMTP ports 25, 465 and 587 on
free web services**. Port 25 is blocked on *every* Render plan (they run on EC2); 465 and
587 are open only on paid instances.

`backend/.env.production` points at `smtp.gmail.com:587`, and **Gmail only listens on 465
and 587** — it has no alternative port. So the TCP connect was black-holed (packets dropped,
not refused), Nodemailer waited out its 2-minute default `connectionTimeout`, then threw.

Because `sendRegistrationOtp` awaits the email before responding
(`backend/src/modules/auth/auth.service.ts`), the HTTP request hung for the same 2 minutes
and then returned a generic 500. The frontend's button stayed in its spinner the whole time.

Two details worth knowing:

- The OTP row **was** written to the database on every attempt. Only delivery failed.
- CORS, the database and the rest of the deployment were fine. The preflight from
  `https://adcet-alumni.netlify.app` returns correct headers.

**Reference:** [Render changelog — free web services will no longer allow outbound traffic to SMTP ports](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)

---

## What we changed

Three of these are permanent improvements; one is a temporary test-only hack.

### 1. SMTP timeouts — *permanent*

`backend/src/lib/mailer.ts`

```ts
connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS) || 15_000,
greetingTimeout:   Number(process.env.SMTP_TIMEOUT_MS) || 15_000,
socketTimeout:    (Number(process.env.SMTP_TIMEOUT_MS) || 15_000) * 2,
```

A firewalled SMTP host now fails in ~15 seconds instead of 120. Keep this regardless of
which provider you end up on — it's the difference between a user seeing an error and a
user watching a spinner.

### 2. A real error instead of a generic 500 — *permanent*

`backend/src/lib/errors.ts` gained a `ServiceUnavailable()` (503) helper, and
`sendRegistrationOtp` now catches delivery failures, logs them with the email address, and
throws:

> "We couldn't send the verification email right now. Please try again in a moment."

The frontend already surfaces that message in its "Could not send code" toast.

### 3. `EXPOSE_OTP_ON_MAIL_FAILURE` — ⚠ **TEMPORARY, TEST ONLY**

When this env var is `"true"` **and** the email fails to send, `POST /auth/register/send-otp`
returns the code in its JSON body instead of a 503:

```json
{ "message": "Email delivery is unavailable — use the code below.", "devCode": "042317" }
```

`src/pages/AuthPage.tsx` reads `devCode`, prefills the OTP input, and shows the code in a
toast — so sign-up completes end-to-end with no mail transport at all.

When the email **does** send, `devCode` is never included, flag on or off.

> **Security:** this lets anyone register an email address they do not own. Account approval
> is still gated on an admin (`status: PENDING`), which limits the blast radius, but this must
> not be on when real users are using the deployment.

### 4. Documentation — *permanent*

`backend/.env.example` now documents the hosting restriction, `SMTP_TIMEOUT_MS`, and the
escape hatch.

### Tests

`backend/src/tests/modules/auth/auth.otp.test.ts` — 5 tests covering the success path,
duplicate-email rejection, the 503 on delivery failure, and both states of the flag. Full
backend suite: **499 passing**.

---

## Going back to Gmail

Gmail's settings were never deleted from `backend/.env.production`. What you do depends on
where the backend runs.

### Case A — local dev, or any host that allows outbound SMTP

Nothing to undo but the flag:

```bash
EXPOSE_OTP_ON_MAIL_FAILURE=false     # or delete the line entirely
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your gmail address>
SMTP_PASS=<16-char Google app password, not your account password>
SMTP_FROM="ADCET Alumni Portal" <noreply@adcet.in>
```

Restart the backend. Gmail delivery works as it always did.

### Case B — stay on Render **and** use Gmail

You must **upgrade the web service to any paid instance type**. Ports 465 and 587 open up on
paid plans; there is no free-tier workaround, because Gmail offers no port outside the
blocked range. After upgrading:

1. Render dashboard → your service → **Environment**
2. Set `EXPOSE_OTP_ON_MAIL_FAILURE=false`
3. Confirm `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`
4. Redeploy

Gmail also caps sending at roughly 500 messages/day and may flag app-password traffic — fine
for a college portal's volume, worth knowing before a bulk event mailing.

### Case C — stay on Render's free tier, but send real email

Port **2525 is not blocked**. Gmail doesn't offer it, but SMTP relays do (Brevo, Mailtrap,
SendGrid). Brevo's free tier is 300 emails/day and needs only a verified sender address — no
domain purchase. This is an env change only, no code change:

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=<brevo login>
SMTP_PASS=<brevo SMTP key>
EXPOSE_OTP_ON_MAIL_FAILURE=false
```

### Case D — no email at all (current state)

Leave `EXPOSE_OTP_ON_MAIL_FAILURE=true`. The OTP appears in the toast. Only for a throwaway
test deployment.

---

## Removing the escape-hatch code entirely

Turning the flag off is enough to make the behaviour go away — the code path is unreachable
without it. If you also want the code gone, delete these pieces:

| File | What to remove |
| --- | --- |
| `backend/src/modules/auth/auth.service.ts` | the `exposeOtpOnMailFailure()` helper and the `if (!exposeOtpOnMailFailure())` branch inside the `catch`; make the `catch` always throw `ServiceUnavailable(...)`; change the return type back to `Promise<void>` |
| `backend/src/modules/auth/auth.controller.ts` | restore the one-line body: `await service.sendRegistrationOtp(req.body.email);` and the plain `message` response |
| `src/pages/AuthPage.tsx` | drop the `devCode` branch in `sendOtp()`, restoring the single "Verification code sent" toast |
| `backend/src/tests/modules/auth/auth.otp.test.ts` | delete the last two `it(...)` blocks (the flag tests) |
| `backend/.env.example`, `backend/.env.production` | delete the `EXPOSE_OTP_ON_MAIL_FAILURE` blocks |

**Keep** the `mailer.ts` timeouts, the `ServiceUnavailable` helper, and the 503 handling.
Those aren't part of the hack — they're why a broken mail server now produces an error
message in 15 seconds instead of a two-minute hang.

If the work is in its own commit, `git revert <sha>` removes all of it, timeouts included —
usually not what you want.

---

## Verifying after any change

```bash
# Should return 202 in a couple of seconds, with NO devCode field
curl -s -w '\n%{http_code} in %{time_total}s\n' \
  -X POST https://<your-backend>/api/v1/auth/register/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"an-address-you-can-check@example.com"}'
```

| Result | Meaning |
| --- | --- |
| `202`, no `devCode`, email arrives | Working correctly |
| `202` **with** `devCode` | Mail is still failing; the flag is masking it. Check backend logs for `failed to send registration OTP email` |
| `503` after ~15s | Mail failing, flag correctly off. The SMTP host is blocked or the credentials are wrong |
| `500` after ~120s | The timeout change isn't deployed — the build is stale |
| `409` | That email already has an account. Use a different one to test |

Backend logs (`Render → Logs`) carry the underlying cause: `ETIMEDOUT` means a blocked port,
`EAUTH` means bad credentials.

---

## Also worth fixing

`backend/.env.production` still has OAuth callbacks pointing at localhost:

```
OAUTH_REDIRECT_BASE_URL=http://localhost:4000/api/v1/auth/oauth
OAUTH_SUCCESS_REDIRECT=http://localhost:8080/auth/callback
```

Google/GitHub sign-in on the deployed site will bounce users to their own machine. These need
to be the Render and Netlify URLs, with the redirect URIs updated in each provider's console
to match. Unrelated to the OTP bug, but it breaks the other route into account creation.
