/**
 * Dev seed: idempotent. Creates one admin + 5 alumni/student/recruiter users
 * with realistic interconnected data — profiles, jobs, events, achievements,
 * donations, RSVPs, applications, and a donation campaign.
 *
 * Re-running this script is safe: every record is upserted by a stable key.
 */
import { PrismaClient, type AppRole, type ApprovalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  status?: ApprovalStatus;
  profile?: Record<string, unknown>;
}

const USERS: SeedUser[] = [
  {
    email: "admin@adcet.in",
    password: "Admin@12345",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    status: "APPROVED",
  },
  {
    email: "alice@adcet.in",
    password: "Alumni@123",
    firstName: "Alice",
    lastName: "Patil",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      bio: "Backend engineer building distributed systems at Infosys.",
      department: "Computer Engineering",
      degree: "BE",
      admissionYear: 2016,
      graduationYear: 2020,
      city: "Pune",
      country: "India",
      currentCompany: "Infosys",
      currentRole: "SDE-2",
      linkedinUrl: "https://linkedin.com/in/alice-patil",
    },
  },
  {
    email: "bob@adcet.in",
    password: "Alumni@123",
    firstName: "Bob",
    lastName: "Kulkarni",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      bio: "Mechanical design engineer passionate about EVs.",
      department: "Mechanical",
      degree: "BE",
      admissionYear: 2015,
      graduationYear: 2019,
      city: "Bengaluru",
      country: "India",
      currentCompany: "Tata Motors",
      currentRole: "Design Engineer",
    },
  },
  {
    email: "priya@adcet.in",
    password: "Alumni@123",
    firstName: "Priya",
    lastName: "Sharma",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      bio: "Full-stack dev, IEEE published researcher.",
      department: "Computer Engineering",
      degree: "ME",
      admissionYear: 2018,
      graduationYear: 2022,
      city: "Mumbai",
      country: "India",
      currentCompany: "TCS",
      currentRole: "Senior Developer",
      githubUrl: "https://github.com/priya-sharma",
    },
  },
  {
    email: "rahul@adcet.in",
    password: "Alumni@123",
    firstName: "Rahul",
    lastName: "Desai",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      bio: "Founder of an EdTech startup. Mentor & angel investor.",
      department: "Electronics",
      degree: "BE",
      admissionYear: 2014,
      graduationYear: 2018,
      city: "Pune",
      country: "India",
      currentCompany: "EduSpark (Founder)",
      currentRole: "CEO",
    },
  },
  {
    email: "sneha@adcet.in",
    password: "Student@123",
    firstName: "Sneha",
    lastName: "Kale",
    role: "STUDENT",
    status: "APPROVED",
    profile: {
      bio: "Final-year CSE, GSoC '26 contributor.",
      department: "Computer Engineering",
      degree: "BE",
      admissionYear: 2022,
      graduationYear: 2026,
      city: "Sangli",
      country: "India",
    },
  },
  {
    email: "neha@recruiter.in",
    password: "Recruit@123",
    firstName: "Neha",
    lastName: "Joshi",
    role: "RECRUITER",
    status: "APPROVED",
    profile: {
      bio: "Talent acquisition lead at Persistent Systems.",
      department: null as unknown as string,
      city: "Pune",
      country: "India",
      currentCompany: "Persistent Systems",
      currentRole: "Sr. Recruiter",
    },
  },
];

const upsertUser = async (u: SeedUser) => {
  const hash = await bcrypt.hash(u.password, 12);
  const user = await prisma.user.upsert({
    where: { email: u.email },
    update: {},
    create: {
      email: u.email,
      passwordHash: hash,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status ?? "PENDING",
      roles: { create: { role: u.role } },
      profile: u.profile ? { create: u.profile as any } : undefined,
      preferences: { create: {} },
    },
  });
  return user;
};

const upsertJob = async (
  externalKey: string,
  data: {
    title: string;
    company: string;
    location?: string;
    isRemote?: boolean;
    employmentType?: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
    description: string;
    requirements?: string;
    vacancies?: number;
    salaryMin?: number;
    salaryMax?: number;
    status: ApprovalStatus;
    createdById: string;
  },
) => {
  // Use a deterministic find — match on (title + company + createdById).
  const existing = await prisma.job.findFirst({
    where: { title: data.title, company: data.company, createdById: data.createdById },
  });
  if (existing) return existing;
  return prisma.job.create({ data });
};

const upsertEvent = async (data: {
  title: string;
  description: string;
  location?: string;
  isOnline?: boolean;
  startsAt: Date;
  endsAt?: Date;
  capacity?: number;
  status: ApprovalStatus;
  createdById: string;
}) => {
  const existing = await prisma.event.findFirst({
    where: { title: data.title, createdById: data.createdById },
  });
  if (existing) return existing;
  return prisma.event.create({ data });
};

const upsertAchievement = async (data: {
  userId: string;
  title: string;
  description: string;
  category?: string;
  occurredOn?: Date;
  status: ApprovalStatus;
}) => {
  const existing = await prisma.achievement.findFirst({
    where: { userId: data.userId, title: data.title },
  });
  if (existing) return existing;
  return prisma.achievement.create({ data });
};

const upsertCampaign = async (data: {
  title: string;
  description: string;
  goalAmount: number;
  startsAt: Date;
  endsAt?: Date;
  isActive?: boolean;
}) => {
  const existing = await prisma.donationCampaign.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return prisma.donationCampaign.create({ data });
};

async function main() {
  console.log("🌱 Seeding users…");
  const created: Record<string, Awaited<ReturnType<typeof upsertUser>>> = {};
  for (const u of USERS) {
    created[u.email] = await upsertUser(u);
  }

  const admin = created["admin@adcet.in"];
  const alice = created["alice@adcet.in"];
  const bob = created["bob@adcet.in"];
  const priya = created["priya@adcet.in"];
  const rahul = created["rahul@adcet.in"];
  const sneha = created["sneha@adcet.in"];
  const neha = created["neha@recruiter.in"];

  console.log("💼 Seeding jobs…");
  const job1 = await upsertJob("job1", {
    title: "Backend Engineer",
    company: "Infosys",
    location: "Pune",
    employmentType: "FULL_TIME",
    description: "Build scalable Node.js microservices on a modern cloud stack.",
    requirements: "3+ yrs Node.js, Postgres, REST/GraphQL.",
    vacancies: 2,
    salaryMin: 1200000,
    salaryMax: 1800000,
    status: "APPROVED",
    createdById: alice.id,
  });
  const job2 = await upsertJob("job2", {
    title: "Frontend Developer (React)",
    company: "Persistent Systems",
    location: "Pune",
    employmentType: "FULL_TIME",
    description: "Own UI architecture for a B2B SaaS product.",
    requirements: "React, TypeScript, design-system experience.",
    vacancies: 3,
    salaryMin: 900000,
    salaryMax: 1500000,
    status: "APPROVED",
    createdById: neha.id,
  });
  const job3 = await upsertJob("job3", {
    title: "Mechanical Design Intern",
    company: "Tata Motors",
    location: "Bengaluru",
    employmentType: "INTERNSHIP",
    description: "Assist EV powertrain CAD modelling.",
    requirements: "Final-year Mechanical, SolidWorks.",
    vacancies: 4,
    status: "APPROVED",
    createdById: bob.id,
  });
  const job4 = await upsertJob("job4", {
    title: "Founding Product Engineer",
    company: "EduSpark",
    location: "Pune",
    isRemote: true,
    employmentType: "FULL_TIME",
    description: "Join an early-stage EdTech as one of the first hires.",
    requirements: "Full-stack, scrappy, ownership mindset.",
    vacancies: 1,
    status: "PENDING",
    createdById: rahul.id,
  });

  console.log("📅 Seeding events…");
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);
  const evt1 = await upsertEvent({
    title: "Annual Alumni Meet 2026",
    description: "Reconnect with batchmates and faculty over dinner.",
    location: "ADCET Campus, Ashta",
    startsAt: inDays(30),
    endsAt: inDays(30),
    capacity: 300,
    status: "APPROVED",
    createdById: admin.id,
  });
  const evt2 = await upsertEvent({
    title: "Tech Talk: Building at Scale",
    description: "Alice shares lessons from production systems at Infosys.",
    location: "Online (Zoom)",
    isOnline: true,
    startsAt: inDays(7),
    capacity: 200,
    status: "APPROVED",
    createdById: alice.id,
  });
  const evt3 = await upsertEvent({
    title: "Founder AMA with Rahul Desai",
    description: "From campus to startup CEO — open Q&A.",
    location: "ADCET Auditorium",
    startsAt: inDays(14),
    capacity: 150,
    status: "PENDING",
    createdById: rahul.id,
  });

  console.log("🏆 Seeding achievements…");
  await upsertAchievement({
    userId: priya.id,
    title: "IEEE Research Paper Published",
    description: "Co-authored a paper on federated learning at IEEE TENCON.",
    category: "Academic",
    occurredOn: inDays(-60),
    status: "APPROVED",
  });
  await upsertAchievement({
    userId: rahul.id,
    title: "Founded EduSpark",
    description: "Raised pre-seed round; 10k students onboarded in year one.",
    category: "Entrepreneurship",
    occurredOn: inDays(-200),
    status: "APPROVED",
  });
  await upsertAchievement({
    userId: sneha.id,
    title: "Selected for GSoC 2026",
    description: "Selected to contribute to the Postgres Foundation org.",
    category: "Open Source",
    occurredOn: inDays(-10),
    status: "PENDING",
  });
  await upsertAchievement({
    userId: alice.id,
    title: "Promoted to SDE-2",
    description: "Recognized for leading the payments rewrite.",
    category: "Career",
    occurredOn: inDays(-90),
    status: "APPROVED",
  });
  await upsertAchievement({
    userId: bob.id,
    title: "Filed EV Patent",
    description: "Co-inventor on a patent for regenerative braking.",
    category: "Technical",
    occurredOn: inDays(-45),
    status: "PENDING",
  });

  console.log("💝 Seeding donation campaign + donations…");
  const campaign = await upsertCampaign({
    title: "ADCET Scholarship Fund 2026",
    description: "Support meritorious students from underprivileged backgrounds.",
    goalAmount: 1_000_000,
    startsAt: inDays(-30),
    endsAt: inDays(120),
    isActive: true,
  });

  // Idempotent: only create if user has no donation in this campaign.
  const ensureDonation = async (
    userId: string,
    amount: number,
    status: "PLEDGED" | "RECEIVED",
    message?: string,
  ) => {
    const existing = await prisma.donation.findFirst({
      where: { userId, campaignId: campaign.id, amount },
    });
    if (existing) return existing;
    return prisma.donation.create({
      data: { userId, campaignId: campaign.id, amount, status, message },
    });
  };

  await ensureDonation(rahul.id, 50000, "RECEIVED", "Happy to give back.");
  await ensureDonation(alice.id, 10000, "RECEIVED");
  await ensureDonation(priya.id, 7500, "RECEIVED", "For the next generation.");
  await ensureDonation(bob.id, 5000, "PLEDGED");

  console.log("✅ Seeding RSVPs + Job applications…");
  const ensureRsvp = async (eventId: string, userId: string) => {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId, status: "GOING" },
    });
  };
  await ensureRsvp(evt1.id, alice.id);
  await ensureRsvp(evt1.id, bob.id);
  await ensureRsvp(evt1.id, priya.id);
  await ensureRsvp(evt2.id, sneha.id);
  await ensureRsvp(evt2.id, priya.id);

  const ensureApplication = async (jobId: string, userId: string) => {
    await prisma.jobApplication.upsert({
      where: { jobId_userId: { jobId, userId } },
      update: {},
      create: { jobId, userId, coverLetter: "Excited to apply." },
    });
  };
  await ensureApplication(job1.id, sneha.id);
  await ensureApplication(job2.id, priya.id);
  await ensureApplication(job3.id, sneha.id);

  console.log("🎉 Seed complete.");
  console.log("   Admin:    admin@adcet.in / Admin@12345");
  console.log("   Alumni:   alice@adcet.in / Alumni@123");
  console.log("   Student:  sneha@adcet.in / Student@123");
  console.log("   Recruiter:neha@recruiter.in / Recruit@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
