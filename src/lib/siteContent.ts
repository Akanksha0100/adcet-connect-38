/**
 * Lightweight site content store for "static" public pages
 * (About, Support, Contact, News, Mentorship, Resources).
 *
 * Persisted in localStorage so admins can edit copy without a backend change.
 * Cross-tab sync via the `storage` event + a custom `adcet:cms` event
 * for same-tab updates.
 */
import { useEffect, useState } from "react";

export type SiteContentKey =
  | "about"
  | "support"
  | "contact"
  | "news"
  | "mentorship"
  | "resources";

export interface SiteSection {
  title: string;
  body: string;
}

export type SiteContent = Record<SiteContentKey, SiteSection>;

const STORAGE_KEY = "adcet:cms:v1";
const EVENT = "adcet:cms";

export const DEFAULT_CONTENT: SiteContent = {
  about: {
    title: "About ADCET Alumni",
    body:
      "The ADCET Alumni Association connects graduates of Annasaheb Dange College of Engineering and Technology across the world. We organise reunions, mentorship programmes, recruitment drives and community giving so every alum can stay engaged with the institution that shaped their career.",
  },
  support: {
    title: "Support",
    body:
      "Need help with your account, an event registration or a donation receipt? Our alumni office responds within one working day. Email support@adcet.in or use the assistant chat in the bottom-right corner of the dashboard.",
  },
  contact: {
    title: "Contact Us",
    body:
      "Annasaheb Dange College of Engineering and Technology\nAshta, Sangli, Maharashtra 416301\nPhone: +91 2342 241 125\nEmail: alumni@adcet.in",
  },
  news: {
    title: "News & Announcements",
    body:
      "Stay tuned for the latest updates from the alumni office, campus highlights, success stories and upcoming events. Posts published here appear on every member's dashboard.",
  },
  mentorship: {
    title: "Mentorship Programme",
    body:
      "Pair up with seniors from your branch for one-to-one career guidance. Alumni can volunteer as mentors; students and recent graduates can request a mentor through their profile page.",
  },
  resources: {
    title: "Resources",
    body:
      "Curated learning material, interview prep guides, scholarship pointers and templates contributed by the alumni community. New resources are vetted by the alumni office before being published.",
  },
};

const read = (): SiteContent => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...parsed };
  } catch {
    return DEFAULT_CONTENT;
  }
};

export const getSiteContent = read;

export const saveSiteContent = (next: SiteContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const resetSiteContent = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const useSiteContent = (): SiteContent => {
  const [content, setContent] = useState<SiteContent>(read);
  useEffect(() => {
    const refresh = () => setContent(read());
    window.addEventListener("storage", refresh);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(EVENT, refresh);
    };
  }, []);
  return content;
};