/**
 * Static, non-authenticated site data used across the public pages
 * (landing, about, news, contact, gallery, map...).
 *
 * Nothing here touches the API — these are institute-level constants that the
 * alumni office maintains by hand. Keep them in one place so the header,
 * footer and individual sections never drift apart.
 */

/** Social handles. Placeholders for now — the alumni office will supply URLs. */
export const SOCIAL_LINKS = [
  { name: "Instagram", href: "#", icon: "instagram" },
  { name: "Twitter", href: "#", icon: "twitter" },
  { name: "LinkedIn", href: "#", icon: "linkedin" },
  { name: "Facebook", href: "#", icon: "facebook" },
] as const;

export const CONTACT = {
  institute: "Annasaheb Dange College of Engineering and Technology (ADCET), Ashta",
  society: "Sant Dnyaneshwar Shikshan Sanstha's",
  address: "Ashta, Taluka Walwa, Dist. Sangli, Maharashtra 416 301",
  mapsUrl: "https://maps.google.com/?q=Annasaheb+Dange+College+of+Engineering+and+Technology+Ashta",
  phones: ["8208536470", "9960819047"],
  email: "alumni@adcet.in",
  /** Shown only in the footer — general queries go to the alumni office. */
  directorEmail: "director@adcet.in",
  website: "https://www.adcet.ac.in",
  websiteLabel: "www.adcet.ac.in",
  officeHours: "Mon–Sat, 9:00 AM – 5:00 PM IST",
} as const;

/** Primary navigation shown in the public header and footer. */
export const PUBLIC_NAV = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "News", to: "/news" },
  { label: "Contact", to: "/contact" },
] as const;

/** Newsletter editions kept as PDFs under `public/NewsLetter/`. */
export const NEWSLETTERS = [
  {
    title: "Alumni Newsletter — 1st Edition",
    href: encodeURI("/NewsLetter/Alumni Newsletter_1st Edition.pdf"),
  },
  {
    title: "Synergy — 2nd Edition, 2026",
    href: encodeURI("/NewsLetter/Alumni Newsletter_ Synergy_2nd Edition 2026.pdf"),
  },
] as const;
