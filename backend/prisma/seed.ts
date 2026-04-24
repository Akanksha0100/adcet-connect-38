/**
 * Dev seed: creates one admin + a handful of alumni so the app is usable
 * out of the box. Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const upsertUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "ADMIN" | "ALUMNI" | "STUDENT" | "RECRUITER",
  profile: Record<string, unknown> = {},
) => {
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hash,
      firstName,
      lastName,
      status: "APPROVED",
      roles: { create: { role } },
      profile: { create: profile },
      preferences: { create: {} },
    },
  });
  return user;
};

async function main() {
  await upsertUser("admin@adcet.in", "Admin@12345", "Admin", "User", "ADMIN");
  await upsertUser("alice@adcet.in", "Alumni@123", "Alice", "Patil", "ALUMNI", {
    department: "Computer Engineering",
    degree: "BE",
    graduationYear: 2020,
    city: "Pune",
    currentCompany: "Infosys",
    currentRole: "SDE-2",
  });
  await upsertUser("bob@adcet.in", "Alumni@123", "Bob", "Kulkarni", "ALUMNI", {
    department: "Mechanical",
    degree: "BE",
    graduationYear: 2019,
    city: "Bengaluru",
    currentCompany: "Tata Motors",
    currentRole: "Design Engineer",
  });

  // eslint-disable-next-line no-console
  console.log("✅ Seed complete. Admin: admin@adcet.in / Admin@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());