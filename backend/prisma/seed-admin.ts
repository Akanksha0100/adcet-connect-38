/**
 * Production admin bootstrap. Creates the one ADMIN account the app can't create
 * for itself — `/auth/register` always produces a PENDING user with no ADMIN role,
 * so without this there is no way into the admin area on a fresh database.
 *
 * Unlike `seed.ts` this inserts **no demo data**: one user, one role row, nothing else.
 *
 * Reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment — never hardcode a
 * password here, this file is in version control.
 *
 * Safe to run on every boot: it creates the account when missing and repairs an
 * existing one (APPROVED status, ADMIN role), but leaves the password alone unless
 * `ADMIN_PASSWORD_FORCE=true`, so a redeploy can't silently revert a password
 * changed from inside the app.
 *
 * It always exits 0. When it is chained ahead of `npm run start`, a bootstrap
 * problem must not stop the API from serving — the log says what went wrong.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Mirrors the `min(8)` rule in auth.validators.ts, so the account can actually log in. */
const MIN_PASSWORD_LENGTH = 8;

const main = async () => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const forcePassword = process.env.ADMIN_PASSWORD_FORCE === "true";

  if (!email || !password) {
    console.log("[seed-admin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `[seed-admin] ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters — refusing to create an account that cannot log in.`,
    );
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: "Admin",
        lastName: "User",
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        roles: { create: { role: "ADMIN" } },
        preferences: { create: {} },
      },
    });
    console.log(`[seed-admin] created admin ${email}`);
    return;
  }

  // Repair anything that would lock the admin out, without touching the rest.
  const repairs: string[] = [];

  if (!existing.roles.some((r) => r.role === "ADMIN")) {
    await prisma.userRole.create({ data: { userId: existing.id, role: "ADMIN" } });
    repairs.push("granted ADMIN role");
  }
  if (existing.status !== "APPROVED") {
    await prisma.user.update({ where: { id: existing.id }, data: { status: "APPROVED" } });
    repairs.push("set status APPROVED");
  }
  if (forcePassword) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    repairs.push("reset password from ADMIN_PASSWORD");
  }

  console.log(
    repairs.length
      ? `[seed-admin] admin ${email} already exists — ${repairs.join(", ")}`
      : `[seed-admin] admin ${email} already exists and is healthy — nothing to do`,
  );
};

main()
  .catch((e) => console.error("[seed-admin] bootstrap failed — the API will still start:", e))
  .finally(() => prisma.$disconnect());
