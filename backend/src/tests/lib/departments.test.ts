import { describe, expect, it } from "@jest/globals";
import { DEPARTMENTS } from "../../config/constants.js";
import { DEPARTMENTS as FRONTEND_DEPARTMENTS } from "../../../../src/lib/departments.js";
import {
  departmentFilterSchema,
  departmentSchema,
  optionalDepartmentSchema,
} from "../../lib/departments.js";
import { registerSchema } from "../../modules/auth/auth.validators.js";
import { eventInputSchema } from "../../modules/events/events.validators.js";
import { jobInputSchema } from "../../modules/jobs/jobs.validators.js";
import { updateProfileSchema } from "../../modules/profiles/profiles.validators.js";

const OFFICIAL = "Computer Science and Engineering";

describe("lib/departments", () => {
  it("is the same list the frontend offers in its dropdowns", () => {
    // The two files are duplicated by necessity (separate apps, separate
    // builds); this test is what keeps them from drifting apart.
    expect([...FRONTEND_DEPARTMENTS]).toEqual([...DEPARTMENTS]);
  });

  it("no longer carries the pre-rename abbreviations", () => {
    for (const legacy of ["CSE", "E&TC", "Robotics & Automation"]) {
      expect(DEPARTMENTS as readonly string[]).not.toContain(legacy);
    }
  });

  describe("departmentSchema", () => {
    it("accepts every official department name", () => {
      for (const d of DEPARTMENTS) expect(departmentSchema.parse(d)).toBe(d);
    });

    it("rejects legacy abbreviations and free text", () => {
      for (const bad of ["CSE", "E&TC", "Comp Sci", ""]) {
        expect(departmentSchema.safeParse(bad).success).toBe(false);
      }
    });
  });

  describe("optionalDepartmentSchema", () => {
    it("treats omitted and empty-string alike as not provided", () => {
      expect(optionalDepartmentSchema.parse(undefined)).toBeUndefined();
      expect(optionalDepartmentSchema.parse("")).toBeUndefined();
    });

    it("still rejects a non-empty invalid name", () => {
      expect(optionalDepartmentSchema.safeParse("CSE").success).toBe(false);
    });
  });

  describe("departmentFilterSchema", () => {
    it("stays lenient so stale filters narrow rather than 400", () => {
      expect(departmentFilterSchema.parse("CSE")).toBe("CSE");
    });
  });
});

describe("department is enforced on every write path", () => {
  const registerInput = {
    email: "a@b.com",
    password: "password123",
    otp: "123456",
    firstName: "A",
    lastName: "B",
    degree: "BE",
    graduationYear: 2020,
    birthDay: 14,
    birthMonth: 3,
    phone: "+91 9876543210",
    city: "Pune",
    currentCompany: "Infosys",
    currentRole: "SDE-2",
    linkedinUrl: "https://linkedin.com/in/a",
  };

  it("sign-up rejects a legacy department and accepts an official one", () => {
    expect(registerSchema.safeParse({ ...registerInput, department: "CSE" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...registerInput, department: OFFICIAL }).success).toBe(true);
  });

  it("profile update rejects a legacy department but still allows clearing it", () => {
    expect(updateProfileSchema.safeParse({ department: "CSE" }).success).toBe(false);
    expect(updateProfileSchema.parse({ department: null }).department).toBeNull();
    expect(updateProfileSchema.parse({ department: OFFICIAL }).department).toBe(OFFICIAL);
  });

  const eventBase = {
    title: "Meetup",
    description: "A long enough description",
    startsAt: "2027-01-01T10:00:00Z",
  };
  const jobBase = {
    title: "Engineer",
    company: "ACME",
    description: "A long enough description",
  };

  it("event creation rejects a legacy department in the target list", () => {
    expect(eventInputSchema.safeParse({ ...eventBase, departments: ["E&TC"] }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...eventBase, departments: [OFFICIAL] }).success).toBe(true);
  });

  it("job creation rejects a legacy department in the target list", () => {
    expect(jobInputSchema.safeParse({ ...jobBase, departments: ["E&TC"] }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...jobBase, departments: [OFFICIAL] }).success).toBe(true);
  });

  it("accepts several departments at once, and defaults to none", () => {
    const other = "Mechanical Engineering";
    const parsed = jobInputSchema.parse({ ...jobBase, departments: [OFFICIAL, other] });
    expect(parsed.departments).toEqual([OFFICIAL, other]);
    // Omitted entirely = open to all, represented as an empty list.
    expect(jobInputSchema.parse(jobBase).departments).toEqual([]);
  });

  it("collapses duplicates so the stored list is a true set", () => {
    const parsed = eventInputSchema.parse({ ...eventBase, departments: [OFFICIAL, OFFICIAL] });
    expect(parsed.departments).toEqual([OFFICIAL]);
  });

  it('drops the legacy "All" sentinel rather than storing it', () => {
    // The old event form submitted "All" to mean "no filter"; an empty list
    // now carries that meaning, so "All" must not survive into the column.
    expect(eventInputSchema.parse({ ...eventBase, departments: ["All"] }).departments).toEqual([]);
    expect(
      eventInputSchema.parse({ ...eventBase, departments: ["All", OFFICIAL] }).departments,
    ).toEqual([OFFICIAL]);
  });
});
