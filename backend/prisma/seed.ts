/**
 * Dev seed: idempotent. Creates one admin + 5 alumni/student/recruiter users
 * with realistic interconnected data — profiles, jobs, events, achievements,
 * donations, RSVPs, applications, and a donation campaign.
 *
 * Re-running this script is safe: every record is upserted by a stable key.
 */
import { PrismaClient, type AppRole, type ApprovalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CHAPTERS } from "../src/config/constants.js";
import { runGeoBackfill } from "../src/jobs/geoBackfill.js";
// The backfill runs against the app's own client, so the seed has to close both.
import { prisma as appPrisma } from "../src/lib/prisma.js";

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  status?: ApprovalStatus;
  profile?: Record<string, unknown>;
  /** Regional chapter to enrol this alumnus into (slug from DEFAULT_CHAPTERS). */
  chapterSlug?: string;
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
      birthDay: 14,
      birthMonth: 3,
      bio: "Backend engineer building distributed systems at Infosys.",
      department: "Computer Science and Engineering",
      degree: "BE",
      admissionYear: 2016,
      graduationYear: 2020,
      city: "Pune",
      country: "India",
      currentCompany: "Infosys",
      currentRole: "SDE-2",
      linkedinUrl: "https://linkedin.com/in/alice-patil",
    },
    chapterSlug: "pune",
  },
  {
    email: "bob@adcet.in",
    password: "Alumni@123",
    firstName: "Bob",
    lastName: "Kulkarni",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      birthDay: 2,
      birthMonth: 8,
      bio: "Mechanical design engineer passionate about EVs.",
      department: "Mechanical Engineering",
      degree: "BE",
      admissionYear: 2015,
      graduationYear: 2019,
      city: "Bengaluru",
      country: "India",
      currentCompany: "Tata Motors",
      currentRole: "Design Engineer",
    },
    chapterSlug: "bangalore",
  },
  {
    email: "priya@adcet.in",
    password: "Alumni@123",
    firstName: "Priya",
    lastName: "Sharma",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      birthDay: 27,
      birthMonth: 11,
      bio: "Full-stack dev, IEEE published researcher.",
      department: "Computer Science and Engineering",
      degree: "ME",
      admissionYear: 2018,
      graduationYear: 2022,
      city: "Mumbai",
      country: "India",
      currentCompany: "TCS",
      currentRole: "Senior Developer",
      githubUrl: "https://github.com/priya-sharma",
    },
    chapterSlug: "mumbai",
  },
  {
    email: "rahul@adcet.in",
    password: "Alumni@123",
    firstName: "Rahul",
    lastName: "Desai",
    role: "ALUMNI",
    status: "APPROVED",
    profile: {
      birthDay: 9,
      birthMonth: 5,
      bio: "Founder of an EdTech startup. Mentor & angel investor.",
      department: "Electronics and Telecommunication Engineering",
      degree: "BE",
      admissionYear: 2014,
      graduationYear: 2018,
      city: "Pune",
      country: "India",
      currentCompany: "EduSpark (Founder)",
      currentRole: "CEO",
    },
    chapterSlug: "pune",
  },
  {
    email: "sneha@adcet.in",
    password: "Student@123",
    firstName: "Sneha",
    lastName: "Kale",
    role: "STUDENT",
    status: "APPROVED",
    profile: {
      birthDay: 21,
      birthMonth: 1,
      bio: "Final-year CSE, GSoC '26 contributor.",
      department: "Computer Science and Engineering",
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
      birthDay: 30,
      birthMonth: 6,
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
      profile: u.profile ? { create: u.profile as Prisma.ProfileCreateWithoutUserInput } : undefined,
      preferences: { create: {} },
    },
  });
  return user;
};

/**
 * Ensure the default chapters exist. Only the slug is a stable key — an
 * existing chapter's name/blurb/isActive are left alone so admin edits are
 * never clobbered by a re-seed.
 */
const upsertChapters = async () => {
  const bySlug = new Map<string, string>();
  for (const c of DEFAULT_CHAPTERS) {
    const row = await prisma.chapter.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, city: c.city, accent: c.accent, blurb: c.blurb },
    });
    bySlug.set(row.slug, row.id);
  }
  return bySlug;
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
    /** Departments targeted; empty/omitted = open to all. */
    departments?: string[];
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
  /** Departments targeted for notifications; empty/omitted = everyone. */
  departments?: string[];
  chapterId?: string;
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

/**
 * News + newsletters the public pages used to hardcode. Seeded so a fresh
 * install shows the same content the site shipped with, after which the alumni
 * office owns it from `/admin/newsroom`.
 */
const upsertNews = async (data: {
  title: string;
  body: string;
  tag: string;
  link?: string;
  publishedAt: Date;
}) => {
  const existing = await prisma.newsItem.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return prisma.newsItem.create({ data });
};

const upsertNewsletter = async (data: {
  title: string;
  description: string;
  fileKey: string;
  coverKey: string;
  publishedAt: Date;
}) => {
  const existing = await prisma.newsletter.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return prisma.newsletter.create({ data });
};

/**
 * Gallery albums the public page used to hardcode. Photo keys are `public/`
 * paths (the files are committed under `public/gallery/`); everything uploaded
 * from `/admin/gallery` afterwards is a storage key instead.
 */
const upsertAlbum = async (data: {
  slug: string;
  title: string;
  eventDate: Date;
  location: string;
  photos: string[];
}) => {
  const existing = await prisma.galleryAlbum.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return prisma.galleryAlbum.create({
    data: {
      slug: data.slug,
      title: data.title,
      eventDate: data.eventDate,
      location: data.location,
      photos: {
        create: data.photos.map((imageKey, sortOrder) => ({ imageKey, sortOrder })),
      },
    },
  });
};

async function main() {
  console.log("🏙  Seeding chapters…");
  const chapterIds = await upsertChapters();

  console.log("🌱 Seeding users…");
  const created: Record<string, Awaited<ReturnType<typeof upsertUser>>> = {};
  for (const u of USERS) {
    created[u.email] = await upsertUser(u);
    const chapterId = u.chapterSlug ? chapterIds.get(u.chapterSlug) : undefined;
    if (chapterId) {
      await prisma.profile.updateMany({
        where: { userId: created[u.email].id, chapterId: null },
        data: { chapterId },
      });
    }
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
    // Open to all three CS-family branches.
    departments: [
      "Computer Science and Engineering",
      "Artificial Intelligence and Data Science",
      "Internet of Things and Cyber Security(CSE)",
    ],
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
    departments: ["Mechanical Engineering"],
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
    // Targeted at two departments — only those alumni get the email.
    departments: [
      "Computer Science and Engineering",
      "Electronics and Telecommunication Engineering",
    ],
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
  // Chapter-targeted: only Pune Chapter members are emailed about this one.
  await upsertEvent({
    title: "Pune Chapter Meetup — Q3 Networking Evening",
    description: "Drinks, lightning talks and referrals with the Pune alumni crowd.",
    location: "Koregaon Park, Pune",
    startsAt: inDays(21),
    capacity: 80,
    chapterId: chapterIds.get("pune"),
    status: "APPROVED",
    createdById: admin.id,
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

  console.log("💝 Seeding donation campaigns + donations…");
  // Donors pick one of these when giving, so the alumni office can see what
  // each contribution was meant for. A donation with no campaign is still
  // valid — it goes to the general fund.
  const campaigns = {
    scholarship: await upsertCampaign({
      title: "ADCET Scholarship Fund 2026",
      description:
        "Support meritorious students from underprivileged backgrounds with tuition, hostel and exam fees so no admission is lost to affordability.",
      goalAmount: 1_000_000,
      startsAt: inDays(-30),
      endsAt: inDays(120),
      isActive: true,
    }),
    labs: await upsertCampaign({
      title: "Laboratory Modernisation Drive",
      description:
        "Re-equip the engineering labs with current instrumentation, workstations and consumables so coursework matches what industry actually uses.",
      goalAmount: 2_500_000,
      startsAt: inDays(-60),
      endsAt: inDays(180),
      isActive: true,
    }),
    library: await upsertCampaign({
      title: "Central Library & Digital Resources",
      description:
        "Fund journal subscriptions, e-book licences and reading-room upgrades — the resources students ask for most and the ones grants rarely cover.",
      goalAmount: 750_000,
      startsAt: inDays(-15),
      endsAt: inDays(150),
      isActive: true,
    }),
    sports: await upsertCampaign({
      title: "Sports & Campus Wellness",
      description:
        "Maintain the grounds, refresh gym equipment and support teams travelling to inter-collegiate tournaments.",
      goalAmount: 500_000,
      startsAt: inDays(-10),
      endsAt: inDays(200),
      isActive: true,
    }),
    incubation: await upsertCampaign({
      title: "Student Startup Incubation Fund",
      description:
        "Seed grants, prototyping budgets and mentorship for student-founded ventures coming out of the campus incubation cell.",
      goalAmount: 1_500_000,
      startsAt: inDays(-5),
      endsAt: inDays(240),
      isActive: true,
    }),
  };

  // Idempotent: only create if user has no donation in this campaign.
  const ensureDonation = async (
    userId: string,
    amount: number,
    status: "PLEDGED" | "RECEIVED",
    campaignId: string | null,
    message?: string,
  ) => {
    const existing = await prisma.donation.findFirst({ where: { userId, campaignId, amount } });
    if (existing) return existing;
    return prisma.donation.create({
      data: { userId, campaignId, amount, status, message },
    });
  };

  await ensureDonation(rahul.id, 50000, "RECEIVED", campaigns.scholarship.id, "Happy to give back.");
  await ensureDonation(alice.id, 10000, "RECEIVED", campaigns.labs.id);
  await ensureDonation(priya.id, 7500, "RECEIVED", campaigns.scholarship.id, "For the next generation.");
  await ensureDonation(bob.id, 5000, "PLEDGED", campaigns.library.id);
  await ensureDonation(alice.id, 25000, "RECEIVED", campaigns.incubation.id, "Backing the founders.");
  await ensureDonation(rahul.id, 15000, "RECEIVED", campaigns.sports.id);
  // A general-fund gift — campaign is genuinely optional.
  await ensureDonation(priya.id, 3000, "RECEIVED", null, "Wherever it's needed most.");

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

  console.log("📰 Seeding news + newsletters…");
  await upsertNews({
    title: "ADCET Hackathon 2026 – Season 3 Now Open",
    tag: "Campus",
    body:
      "ADCET Hackathon Season 3 is underway, themed around Sustainable Development Goals (SDGs) and Vikasit Bharat-2047. Alumni are invited to mentor student teams and participate as judges.",
    link: "https://www.adcet.ac.in",
    publishedAt: new Date("2026-06-01"),
  });
  await upsertNews({
    title: "Alumni Database Update Drive",
    tag: "Alumni Cell",
    body:
      "ADCET has launched a drive to update its alumni database. If you graduated from ADCET, fill in the form to ensure you receive alumni portal invitations, event notifications and placement referral opportunities.",
    link: "https://forms.gle/wfafkr3xvBxDGPup6",
    publishedAt: new Date("2026-03-01"),
  });
  await upsertNews({
    title: "Placement Season 2025–26 Ongoing",
    tag: "Placements",
    body:
      "Companies continue to visit campus through this placement season. Alumni working in industry are encouraged to refer open positions to the Placement Cell.",
    publishedAt: new Date("2026-01-15"),
  });
  await upsertNews({
    title: "NAAC A++ Reaffirmation",
    tag: "Accreditation",
    body:
      "ADCET has once again been reaffirmed with the NAAC A++ grade — the highest accreditation a college can achieve in India. This recognition reflects our commitment to quality education, research, and student outcomes.",
    publishedAt: new Date("2025-09-01"),
  });
  await upsertNews({
    title: "JSW Foundation-Sponsored Innovation: Plastic Bottle Shredder",
    tag: "Innovation",
    body:
      "A team of ADCET engineering students designed and developed a Plastic Bottle Shredding Machine sponsored by JSW Foundation — a practical solution addressing the plastic waste problem in rural Maharashtra.",
    publishedAt: new Date("2025-07-01"),
  });
  await upsertNews({
    title: "Research & Publications",
    tag: "Research",
    body:
      "ADCET faculty and students publish research papers in national and international journals annually. Alumni with industry research experience are welcome to collaborate on funded projects and consultancy.",
    link: "https://www.adcet.ac.in",
    publishedAt: new Date("2025-04-01"),
  });

  // These two editions predate admin uploads, so their keys are `public/` paths
  // rather than storage keys — `assetUrl()` on the frontend resolves both.
  await upsertNewsletter({
    title: "Synergy — 2nd Edition",
    description: "Alumni & Institute: reunions, chapter activity and campus updates from the past year.",
    fileKey: "/NewsLetter/Alumni Newsletter_ Synergy_2nd Edition 2026.pdf",
    coverKey: "/NewsLetter/Alumni Newsletter_ Synergy_2nd Edition 2026-cover.png",
    publishedAt: new Date("2026-05-01"),
  });
  await upsertNewsletter({
    title: "Alumni Newsletter — 1st Edition",
    description: "The inaugural edition of the ADCET Alumni Cell newsletter.",
    fileKey: "/NewsLetter/Alumni Newsletter_1st Edition.pdf",
    coverKey: "/NewsLetter/Alumni Newsletter_1st Edition-cover.png",
    publishedAt: new Date("2025-05-01"),
  });

  console.log("🖼  Seeding gallery albums…");
  await upsertAlbum({
    slug: "pune-chapter-march-2025",
    title: "Pune Chapter Meet",
    eventDate: new Date("2025-03-01"),
    location: "Pune",
    photos: [
      "/gallery/PuneChapter1March2025/1.png",
      "/gallery/PuneChapter1March2025/COEPPune.png",
      "/gallery/PuneChapter1March2025/2.JPG",
      "/gallery/PuneChapter1March2025/3.JPG",
      "/gallery/PuneChapter1March2025/4.jpeg",
      "/gallery/PuneChapter1March2025/5.jpeg",
      "/gallery/PuneChapter1March2025/6.jpeg",
    ],
  });
  await upsertAlbum({
    slug: "pune-chapter-sep-2025",
    title: "Pune Chapter Meet",
    eventDate: new Date("2025-09-29"),
    location: "Pune",
    photos: [
      "/gallery/PuneChapter29Sep2025/20250928_113711AMByGPSMapCamera.jpg",
      "/gallery/PuneChapter29Sep2025/WhatsApp Image 2026-07-14 at 11.02.48 AM.jpeg",
    ],
  });

  // Place the seeded alumni on the map. Gazetteer-only, so seeding never
  // depends on the network being up or on Nominatim being reachable.
  console.log("🗺  Placing alumni on the map…");
  const placed = await runGeoBackfill({ allowRemote: false });
  console.log(`   ${placed.profilesUpdated} profile(s) placed across ${placed.resolved} cit(ies).`);

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
  .finally(() => Promise.all([prisma.$disconnect(), appPrisma.$disconnect()]));
