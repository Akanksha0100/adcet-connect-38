/**
 * Typed API client for the ADCET Alumni backend.
 *
 * - Reads base URL from `VITE_API_BASE_URL` (set in `.env`). Production = change env, redeploy.
 * - Persists tokens in localStorage under `adcet.tokens`.
 * - Auto-attaches `Authorization: Bearer <accessToken>`.
 * - On 401, transparently calls `/auth/refresh` once, then retries the request.
 * - On hard auth failure, clears tokens and dispatches `adcet:auth-expired` so
 *   the AuthContext can sign the user out.
 *
 * Keep this file framework-agnostic — no React imports here.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api/v1";

export type AppRole = "ALUMNI" | "STUDENT" | "ADMIN" | "RECRUITER";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ApprovalStatus;
  roles: AppRole[];
  rejectionReason?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const TOKENS_KEY = "adcet.tokens";

export const tokenStore = {
  get(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  },
  set(t: AuthTokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  },
  clear() {
    localStorage.removeItem(TOKENS_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip auth header even when a token is available. */
  anonymous?: boolean;
  /** Internal — prevents infinite refresh loops. */
  _retry?: boolean;
  /** Read raw text instead of parsing JSON (e.g. CSV downloads). */
  raw?: boolean;
}

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
};

let refreshInflight: Promise<AuthTokens | null> | null = null;

/** Calls `/auth/refresh`. Returns new tokens or null on failure. Single-flight. */
const refreshTokens = async (): Promise<AuthTokens | null> => {
  if (refreshInflight) return refreshInflight;
  const current = tokenStore.get();
  if (!current?.refreshToken) return null;

  refreshInflight = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return null;
      const tokens = (await res.json()) as Omit<AuthTokens, "user"> & { user?: AuthUser };
      const merged: AuthTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user ?? current.user,
      };
      tokenStore.set(merged);
      return merged;
    } catch {
      return null;
    } finally {
      refreshInflight = null;
    }
  })();

  return refreshInflight;
};

const handleAuthFailure = () => {
  tokenStore.clear();
  window.dispatchEvent(new CustomEvent("adcet:auth-expired"));
};

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous, _retry, raw } = opts;
  const tokens = anonymous ? null : tokenStore.get();

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (tokens?.accessToken) headers["Authorization"] = `Bearer ${tokens.accessToken}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !anonymous && !_retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiRequest<T>(path, { ...opts, _retry: true });
    handleAuthFailure();
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    if (res.status === 401) handleAuthFailure();
    // The backend wraps errors as `{ error: { code, message, details } }`.
    // Fall back to a top-level shape (and finally a generic message) for safety.
    const err = payload?.error ?? payload;
    let message: string = err?.message ?? `Request failed with ${res.status}`;
    // Zod validation errors carry per-field messages in details.fieldErrors —
    // surface them so toasts say *what* failed, not just "Validation failed".
    const fieldErrors = err?.details?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors && typeof fieldErrors === "object") {
      const parts = Object.entries(fieldErrors)
        .filter(([, msgs]) => Array.isArray(msgs) && msgs.length)
        .map(([field, msgs]) => `${field}: ${msgs[0]}`);
      if (parts.length) message = `${message} — ${parts.join("; ")}`;
    }
    throw new ApiError(message, res.status, err?.code, err?.details);
  }

  if (raw) return (await res.text()) as unknown as T;

  // Some endpoints (logout, deletes) may legitimately return empty body with 200/202.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"], opts?: Omit<RequestOptions, "method" | "query" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET", query }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body }),
  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};

export const API_BASE_URL = BASE_URL;

/** Build a full URL to a backend endpoint (used for OAuth redirects). */
export const apiUrl = (path: string) => `${BASE_URL}${path}`;

export async function uploadFile(
  file: File,
  scope: "avatar" | "banner" | "event" | "achievement" | "receipt" | "resume",
): Promise<{ key: string; publicUrl: string }> {
  const tokens = tokenStore.get();
  const url = buildUrl("/uploads/direct", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    scope,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(tokens?.accessToken && { Authorization: `Bearer ${tokens.accessToken}` }),
    },
    body: file,
  });
  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      payload?.message ?? `Upload failed with ${res.status}`,
      res.status,
      payload?.code,
      payload?.details,
    );
  }
  return res.json() as Promise<{ key: string; publicUrl: string }>;
}
