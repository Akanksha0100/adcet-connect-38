/**
 * Static, non-authenticated site data used across the public pages
 * (landing, about, news, contact, gallery, map...).
 *
 * Nothing here touches the API — these are institute-level constants that the
 * alumni office maintains by hand. Keep them in one place so the header,
 * footer and individual sections never drift apart.
 */

/**
 * Official alumni-cell social accounts, rendered by `SocialLinks` in the
 * landing hero, the public footer and the contact page.
 *
 * Every `href` must be an absolute `https://` URL — `SocialLinks` only opens a
 * link in a new tab when it starts with "http", and a protocol-less value like
 * `www.youtube.com/...` would be treated as a path relative to the current
 * page. Keep tracking parameters out so site visits aren't misattributed.
 */
export const SOCIAL_LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/adcet_alumni_cell/", icon: "instagram" },
  { name: "X (Twitter)", href: "https://x.com/Adcet_Alumni", icon: "x" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/adcet", icon: "linkedin" },
  { name: "YouTube", href: "https://www.youtube.com/@ADCETALUMNI", icon: "youtube" },
] as const;

export const CONTACT = {
  institute: "Annasaheb Dange College of Engineering and Technology (ADCET), Ashta",
  society: "Sant Dnyaneshwar Shikshan Sanstha's",
  address: "Ashta, Taluka Walwa, Dist. Sangli, Maharashtra 416 301",
  mapsUrl: "https://maps.google.com/?q=Annasaheb+Dange+College+of+Engineering+and+Technology+Ashta",
  phones: ["8208536470"],
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
  { label: "Alumni Map", to: "/alumni-map" },
  { label: "Gallery", to: "/gallery" },
  { label: "News", to: "/news" },
  { label: "Newsletters", to: "/newsletters" },
  { label: "Contact", to: "/contact" },
] as const;
