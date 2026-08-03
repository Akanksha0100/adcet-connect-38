/**
 * What counts as a "complete" profile.
 *
 * Form sign-up collects all of this up front (`registerSchema`), but SSO
 * sign-in cannot: Google/LinkedIn/GitHub hand back a name and an email and
 * nothing else. Rather than let those accounts through with an empty profile,
 * `loginWithOAuth` creates them PENDING and the frontend forces them through
 * `/complete-profile`, which posts the same fields to
 * `POST /auth/complete-profile`.
 *
 * Keep this list in step with the mandatory half of `registerSchema` — a field
 * that is required at sign-up but missing here would let an SSO user skip it.
 */

/** Profile columns an account must have filled before it can be used. */
export const REQUIRED_PROFILE_FIELDS = [
  "department",
  "degree",
  "graduationYear",
  "birthDay",
  "birthMonth",
  "phone",
  "city",
  "currentCompany",
  "currentRole",
  "linkedinUrl",
] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

type ProfileLike = Partial<Record<RequiredProfileField, unknown>> | null | undefined;

/** Fields still missing — drives both the boolean below and admin diagnostics. */
export const missingProfileFields = (profile: ProfileLike): RequiredProfileField[] => {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    if (value == null) return true;
    // Guard against columns holding "" or "   " from older, laxer writes.
    return typeof value === "string" && value.trim() === "";
  });
};

export const isProfileComplete = (profile: ProfileLike): boolean =>
  missingProfileFields(profile).length === 0;
