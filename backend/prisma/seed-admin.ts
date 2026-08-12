/**
 * Production bootstrap. Creates the accounts the app can't create for itself —
 * `/auth/register` always produces a PENDING user with no ADMIN role, so without
 * this there is no way into the admin area on a fresh database.
 *
 * Two independent halves, each gated on its own environment variables:
 *
 *   1. **The admin** (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) — required to administer
 *      the site at all.
 *   2. **Two demo alumni** (`DEMO_PASSWORD`) — Alice and Priya, so the deployed
 *      site can be clicked through as an ordinary member rather than only as an
 *      admin. Skipped entirely when `DEMO_PASSWORD` is unset, which is what a
 *      real production deployment should do.
 *
 * Unlike `seed.ts` this inserts **no other demo data**: no events, jobs, posts or
 * donations, just the accounts and the profiles they need to get past onboarding.
 *
 * Passwords come from the environment — never hardcode one here, this file is in
 * version control and these accounts exist on a public site.
 *
 * Safe to run on every boot: each account is created when missing and repaired
 * when present (APPROVED status, correct role), but passwords are left alone
 * unless `ADMIN_PASSWORD_FORCE` / `DEMO_PASSWORD_FORCE` is `true`, so a redeploy
 * can't silently revert a password changed from inside the app.
 *
 * It always exits 0. When it is chained ahead of `npm run start`, a bootstrap
 * problem must not stop the API from serving — the log says what went wrong.
 */
import { PrismaClient, type AppRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { GAZETTEER, locationSlug, roundCoord } from "../src/config/gazetteer.js";

const prisma = new PrismaClient();

/** Mirrors the `min(8)` rule in auth.validators.ts, so the account can actually log in. */
const MIN_PASSWORD_LENGTH = 8;

const seedAdmin = async () => {
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

// === Demo alumni ===========================================================

/**
 * The two members the deployed site can be tested as.
 *
 * Every field `REQUIRED_PROFILE_FIELDS` lists is filled in — department, degree,
 * graduation year, birthday, phone, city, company, role and LinkedIn. Miss one
 * and `ProtectedRoute` bounces the account to `/complete-profile` on first
 * login, which would make it useless for testing. `admissionYear` follows the
 * same rule `admissionYearFor` applies at sign-up: graduation year minus the
 * course length (B.E. 4 years, M.E. 2).
 */
const DEMO_USERS = [
  {
    email: "alice@adcet.in",
    firstName: "Alice",
    lastName: "Patil",
    role: "ALUMNI" as AppRole,
    profile: {
      bio: "Backend engineer building distributed systems at Infosys.",
      department: "Computer Science and Engineering",
      degree: "BE" as const,
      admissionYear: 2016,
      graduationYear: 2020,
      birthDay: 14,
      birthMonth: 3,
      phone: "9876543210",
      city: "Pune",
      country: "India",
      currentCompany: "Infosys",
      currentRole: "SDE-2",
      linkedinUrl: "https://linkedin.com/in/alice-patil",
    },
  },
  {
    email: "priya@adcet.in",
    firstName: "Priya",
    lastName: "Sharma",
    role: "ALUMNI" as AppRole,
    profile: {
      bio: "Full-stack dev, IEEE published researcher.",
      department: "Computer Science and Engineering",
      degree: "ME" as const,
      admissionYear: 2020,
      graduationYear: 2022,
      birthDay: 27,
      birthMonth: 11,
      phone: "9765432108",
      city: "Mumbai",
      country: "India",
      currentCompany: "TCS",
      currentRole: "Senior Developer",
      linkedinUrl: "https://linkedin.com/in/priya-sharma",
      githubUrl: "https://github.com/priya-sharma",
    },
  },
];

/**
 * Resolve a demo user's city to the shared `GeoLocation` row so they show up on
 * the alumni map immediately.
 *
 * Gazetteer-only and offline: no geocoder call during boot. Both demo cities are
 * in the gazetteer, but an unknown one just returns null and leaves the profile
 * unplaced until the nightly backfill — never a reason to fail the bootstrap.
 */
const resolveCity = async (city: string) => {
  const entry = GAZETTEER.find((g) => g.city === city);
  if (!entry) return null;

  const row = await prisma.geoLocation.upsert({
    where: { slug: locationSlug(entry.city, entry.country) },
    update: {},
    create: {
      slug: locationSlug(entry.city, entry.country),
      city: entry.city,
      state: entry.state ?? null,
      country: entry.country,
      lat: roundCoord(entry.lat),
      lng: roundCoord(entry.lng),
      source: "GAZETTEER",
    },
    select: { id: true },
  });
  return row.id;
};

const seedDemoUsers = async () => {
  const password = process.env.DEMO_PASSWORD?.trim();
  const forcePassword = process.env.DEMO_PASSWORD_FORCE === "true";

  if (!password) {
    console.log("[seed-admin] DEMO_PASSWORD not set — skipping demo alumni.");
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `[seed-admin] DEMO_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters — refusing to create accounts that cannot log in.`,
    );
    return;
  }

  for (const demo of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: demo.email },
      include: { roles: true },
    });

    if (!existing) {
      const locationId = await resolveCity(demo.profile.city);
      await prisma.user.create({
        data: {
          email: demo.email,
          passwordHash: await bcrypt.hash(password, 12),
          firstName: demo.firstName,
          lastName: demo.lastName,
          status: "APPROVED",
          emailVerifiedAt: new Date(),
          roles: { create: { role: demo.role } },
          profile: { create: { ...demo.profile, locationId } },
          preferences: { create: {} },
        },
      });
      console.log(`[seed-admin] created demo ${demo.role.toLowerCase()} ${demo.email}`);
      continue;
    }

    // Same repair-don't-clobber rule as the admin: fix what would block a
    // login, leave everything the account has changed since alone.
    const repairs: string[] = [];

    if (!existing.roles.some((r) => r.role === demo.role)) {
      await prisma.userRole.create({ data: { userId: existing.id, role: demo.role } });
      repairs.push(`granted ${demo.role} role`);
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
      repairs.push("reset password from DEMO_PASSWORD");
    }

    console.log(
      repairs.length
        ? `[seed-admin] demo ${demo.email} already exists — ${repairs.join(", ")}`
        : `[seed-admin] demo ${demo.email} already exists and is healthy — nothing to do`,
    );
  }
};

const main = async () => {
  await seedAdmin();
  await seedDemoUsers();
};

main()
  .catch((e) => console.error("[seed-admin] bootstrap failed — the API will still start:", e))
  .finally(() => prisma.$disconnect());
