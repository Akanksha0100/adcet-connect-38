/**
 * Intro copy for the two in-portal pages that are not feature screens:
 * `/dashboard/news` and `/dashboard/support`.
 *
 * This is fixed copy, not a CMS. The alumni office publishes *content* — news
 * items and newsletters — from `/admin/newsroom`; the public site owns the
 * marketing pages. Everything the old admin "Site Content" editor managed
 * (About, Contact, Mentorship, Resources) now lives on the public pages.
 */
export type SiteContentKey = "news" | "support";

export interface SiteSection {
  title: string;
  body: string;
}

export const DEFAULT_CONTENT: Record<SiteContentKey, SiteSection> = {
  news: {
    title: "News & Announcements",
    body:
      "Stay tuned for the latest updates from the alumni office, campus highlights, success stories and upcoming events. Posts published here appear on every member's dashboard.",
  },
  support: {
    title: "Support",
    body:
      "Need help with your account, an event registration or a donation receipt? Our alumni office responds within one working day. Email support@adcet.in or use the assistant chat in the bottom-right corner of the dashboard.",
  },
};
