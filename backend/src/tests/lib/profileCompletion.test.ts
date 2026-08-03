import { describe, expect, it } from "@jest/globals";
import {
  REQUIRED_PROFILE_FIELDS,
  isProfileComplete,
  missingProfileFields,
} from "../../lib/profileCompletion.js";
import { requiredProfileFields } from "../../modules/auth/auth.validators.js";

const completeProfile = {
  department: "Computer Science and Engineering",
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

describe("lib/profileCompletion", () => {
  it("covers exactly the mandatory fields sign-up demands", () => {
    // If these drift, an SSO user could skip a field the sign-up form requires
    // (or be blocked on one it doesn't collect).
    const required = Object.keys(requiredProfileFields).filter(
      (k) => !["githubUrl", "twitterUrl", "websiteUrl", "bio"].includes(k),
    );
    expect([...REQUIRED_PROFILE_FIELDS].sort()).toEqual(required.sort());
  });

  it("accepts a fully populated profile", () => {
    expect(isProfileComplete(completeProfile)).toBe(true);
    expect(missingProfileFields(completeProfile)).toEqual([]);
  });

  it("treats a missing profile row as entirely incomplete", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
    expect(missingProfileFields(null)).toEqual([...REQUIRED_PROFILE_FIELDS]);
  });

  it("treats the empty profile an OAuth sign-in creates as incomplete", () => {
    expect(isProfileComplete({})).toBe(false);
  });

  it.each(REQUIRED_PROFILE_FIELDS)("is incomplete when %s is null", (field) => {
    expect(isProfileComplete({ ...completeProfile, [field]: null })).toBe(false);
    expect(missingProfileFields({ ...completeProfile, [field]: null })).toEqual([field]);
  });

  it("does not count a whitespace-only string as filled in", () => {
    // Older, laxer writes could leave "" or "   " behind.
    expect(isProfileComplete({ ...completeProfile, city: "   " })).toBe(false);
    expect(isProfileComplete({ ...completeProfile, city: "" })).toBe(false);
  });

  it("ignores the optional fields", () => {
    expect(isProfileComplete({ ...completeProfile, githubUrl: null, bio: null })).toBe(true);
  });
});
