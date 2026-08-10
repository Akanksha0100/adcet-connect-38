/**
 * News + newsletters — the two content types the alumni office publishes from
 * `/admin/newsroom` and the public site renders. Both live behind
 * `/content/*`: public GET, admin-only writes.
 */
import { api } from "@/lib/api";

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  tag?: string | null;
  publishedAt: string;
}

export interface Newsletter {
  id: string;
  title: string;
  description?: string | null;
  /** Storage key of the PDF, or a `public/` path for pre-upload editions. */
  fileKey: string;
  /** First page of `fileKey`, rendered at upload time. */
  coverKey?: string | null;
  publishedAt: string;
}

interface Paginated<T> {
  items: T[];
}

export const newsQuery = () => ({
  queryKey: ["content", "news"] as const,
  queryFn: () => api.get<Paginated<NewsItem>>("/content/news", { pageSize: 100 }),
});

export const newslettersQuery = () => ({
  queryKey: ["content", "newsletters"] as const,
  queryFn: () => api.get<Paginated<Newsletter>>("/content/newsletters", { pageSize: 100 }),
});

/** "June 2026" — the granularity the alumni office actually publishes at. */
export const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
