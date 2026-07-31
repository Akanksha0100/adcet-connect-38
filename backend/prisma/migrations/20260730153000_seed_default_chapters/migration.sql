-- Seed the three launch chapters so every environment (not just seeded dev
-- databases) has them. Idempotent: ON CONFLICT keeps any admin edits made to
-- an existing row. Chapters are never deleted, only archived via "isActive".
INSERT INTO "Chapter" ("id", "slug", "name", "city", "accent", "blurb", "isActive", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid(), 'pune', 'Pune Chapter', 'Pune', 'from-orange-500 to-amber-400',
    'Our largest regional community — IT, automotive and manufacturing professionals who meet through reunions, tech talks and referral drives.',
    true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), 'mumbai', 'Mumbai Chapter', 'Mumbai', 'from-cyan-500 to-sky-400',
    'Alumni across finance, infrastructure, consulting and media in the MMR, connecting juniors to opportunities in the country''s commercial capital.',
    true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), 'bangalore', 'Bangalore Chapter', 'Bangalore', 'from-emerald-500 to-lime-400',
    'Engineers, founders and researchers in India''s technology hub, driving mentorship, internships and startup collaboration for ADCET students.',
    true, NOW(), NOW()
  )
ON CONFLICT ("slug") DO NOTHING;
