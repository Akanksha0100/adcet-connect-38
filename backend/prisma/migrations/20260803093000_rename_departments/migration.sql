-- Normalise every stored department to the official ADCET department names,
-- which are now the single source of truth in `backend/src/config/constants.ts`
-- (DEPARTMENTS) and enforced by `lib/departments.ts` on every write path.
--
-- Two kinds of legacy value exist. The abbreviations ("CSE", "E&TC", …) came
-- from the previous DEPARTMENTS constant. The looser spellings ("Computer
-- Engineering", "Mechanical", …) predate that constant, from when the column
-- was free text — which is exactly what the enum-validated write paths now
-- prevent.
--
-- Matching is on lower(trim(...)) so stray case and whitespace are caught too.
-- Only these three columns ever hold a department name. NULLs and values that
-- match nothing here are left untouched: they will simply fail to match any
-- filter until their owner re-picks a department from the dropdown.

CREATE TEMP TABLE _department_rename (old_name text PRIMARY KEY, new_name text NOT NULL);

INSERT INTO _department_rename (old_name, new_name) VALUES
  -- Previous DEPARTMENTS constant (abbreviations).
  ('cse',                        'Computer Science and Engineering'),
  ('cse (iot & cyber security)', 'Internet of Things and Cyber Security(CSE)'),
  ('cse (ai & data science)',    'Artificial Intelligence and Data Science'),
  ('robotics & automation',      'Robotics and Artificial Intelligence'),
  ('e&tc',                       'Electronics and Telecommunication Engineering'),
  -- Free-text era spellings.
  ('computer engineering',       'Computer Science and Engineering'),
  ('computer science',           'Computer Science and Engineering'),
  ('comp',                       'Computer Science and Engineering'),
  ('it',                         'Computer Science and Engineering'),
  ('mechanical',                 'Mechanical Engineering'),
  ('mech',                       'Mechanical Engineering'),
  ('electronics',                'Electronics and Telecommunication Engineering'),
  ('entc',                       'Electronics and Telecommunication Engineering'),
  ('electrical',                 'Electrical Engineering'),
  ('civil',                      'Civil Engineering'),
  ('aeronautical',               'Aeronautical Engineering'),
  ('food tech',                  'Food Technology'),
  ('aids',                       'Artificial Intelligence and Data Science'),
  ('ai & ds',                    'Artificial Intelligence and Data Science'),
  ('ai and ds',                  'Artificial Intelligence and Data Science'),
  ('iot',                        'Internet of Things and Cyber Security(CSE)'),
  ('robotics',                   'Robotics and Artificial Intelligence');

UPDATE "Profile" p
   SET "department" = r.new_name
  FROM _department_rename r
 WHERE lower(trim(p."department")) = r.old_name
   AND p."department" <> r.new_name;

UPDATE "Event" e
   SET "department" = r.new_name
  FROM _department_rename r
 WHERE lower(trim(e."department")) = r.old_name
   AND e."department" <> r.new_name;

UPDATE "Job" j
   SET "department" = r.new_name
  FROM _department_rename r
 WHERE lower(trim(j."department")) = r.old_name
   AND j."department" <> r.new_name;

DROP TABLE _department_rename;
