/**
 * OAuth provider unit tests.
 *
 * The providers are thin adapters around `fetch` — there is no DB or app
 * involvement, so we mock the global `fetch` and assert:
 *   - `isConfigured()` correctly reflects env presence
 *   - `getAuthUrl()` includes required OAuth params
 *   - `exchangeCode()` happy paths return a normalized profile
 *   - `exchangeCode()` failure modes throw with a useful message
 *   - GitHub's email-fallback to /user/emails works when /user has no email
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const ORIGINAL_FETCH = global.fetch;

const setEnv = () => {
  process.env.GOOGLE_CLIENT_ID = "g-id";
  process.env.GOOGLE_CLIENT_SECRET = "g-secret";
  process.env.GITHUB_CLIENT_ID = "gh-id";
  process.env.GITHUB_CLIENT_SECRET = "gh-secret";
  process.env.LINKEDIN_CLIENT_ID = "li-id";
  process.env.LINKEDIN_CLIENT_SECRET = "li-secret";
  process.env.OAUTH_REDIRECT_BASE_URL = "http://localhost:4000/api/v1/auth/oauth";
};
const clearEnv = () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
  delete process.env.OAUTH_REDIRECT_BASE_URL;
};

/** Builds a fetch mock that returns successive responses for successive calls. */
const sequence = (
  responses: Array<{ ok?: boolean; json?: unknown; text?: string; status?: number }>,
) => {
  const fn = jest.fn();
  responses.forEach((r) =>
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
      text: async () => r.text ?? JSON.stringify(r.json),
    } as Response),
  );
  return fn;
};

beforeEach(() => setEnv());
afterEach(() => {
  clearEnv();
  global.fetch = ORIGINAL_FETCH;
  jest.resetModules();
});

describe("oauth/google", () => {
  it("isConfigured() reports false when env vars are missing", async () => {
    clearEnv();
    jest.resetModules();
    const { googleProvider } = await import("../../../modules/auth/providers/google.js");
    expect(googleProvider.isConfigured()).toBe(false);
  });

  it("getAuthUrl() embeds client_id, scopes and the supplied state", async () => {
    const { googleProvider } = await import("../../../modules/auth/providers/google.js");
    const url = googleProvider.getAuthUrl("xyz");
    expect(url).toContain("client_id=g-id");
    expect(url).toContain("state=xyz");
    expect(url).toContain("scope=openid+email+profile");
    expect(url).toContain("response_type=code");
  });

  it("exchangeCode() returns a normalized OAuthProfile on success", async () => {
    global.fetch = sequence([
      { json: { access_token: "tok" } },
      {
        json: {
          sub: "g-123",
          email: "u@gmail.com",
          email_verified: true,
          given_name: "Geo",
          family_name: "User",
          picture: "http://img/x.png",
        },
      },
    ]) as unknown as typeof fetch;
    const { googleProvider } = await import("../../../modules/auth/providers/google.js");
    const profile = await googleProvider.exchangeCode("code-1");
    expect(profile).toMatchObject({
      provider: "google",
      providerId: "g-123",
      email: "u@gmail.com",
      emailVerified: true,
      firstName: "Geo",
      lastName: "User",
    });
  });

  it("exchangeCode() throws when token endpoint fails", async () => {
    global.fetch = sequence([
      { ok: false, status: 400, text: "bad_request" },
    ]) as unknown as typeof fetch;
    const { googleProvider } = await import("../../../modules/auth/providers/google.js");
    await expect(googleProvider.exchangeCode("code-1")).rejects.toThrow(/token exchange failed/);
  });

  it("exchangeCode() throws when userinfo endpoint fails", async () => {
    global.fetch = sequence([
      { json: { access_token: "tok" } },
      { ok: false, status: 401, text: "unauthorized" },
    ]) as unknown as typeof fetch;
    const { googleProvider } = await import("../../../modules/auth/providers/google.js");
    await expect(googleProvider.exchangeCode("code-1")).rejects.toThrow(/userinfo failed/);
  });
});

describe("oauth/github", () => {
  it("isConfigured() requires both client id+secret AND redirect base", async () => {
    delete process.env.GITHUB_CLIENT_SECRET;
    jest.resetModules();
    const { githubProvider } = await import("../../../modules/auth/providers/github.js");
    expect(githubProvider.isConfigured()).toBe(false);
  });

  it("getAuthUrl() requests user-email scope", async () => {
    const { githubProvider } = await import("../../../modules/auth/providers/github.js");
    const url = githubProvider.getAuthUrl("s1");
    expect(url).toContain("scope=read%3Auser+user%3Aemail");
    expect(url).toContain("client_id=gh-id");
  });

  it("exchangeCode() falls back to /user/emails when primary email missing on /user", async () => {
    global.fetch = sequence([
      { json: { access_token: "tok" } },
      { json: { id: 9, login: "ghu", name: "Gh User" } }, // no email
      {
        json: [
          { email: "secondary@x.com", primary: false, verified: true },
          { email: "primary@x.com", primary: true, verified: true },
        ],
      },
    ]) as unknown as typeof fetch;
    const { githubProvider } = await import("../../../modules/auth/providers/github.js");
    const profile = await githubProvider.exchangeCode("c");
    expect(profile.email).toBe("primary@x.com");
    expect(profile.emailVerified).toBe(true);
    expect(profile.providerId).toBe("9");
  });

  it("exchangeCode() throws when no email is available at all", async () => {
    global.fetch = sequence([
      { json: { access_token: "tok" } },
      { json: { id: 9, login: "ghu" } },
      { json: [] },
    ]) as unknown as typeof fetch;
    const { githubProvider } = await import("../../../modules/auth/providers/github.js");
    await expect(githubProvider.exchangeCode("c")).rejects.toThrow(/no accessible email/);
  });
});

describe("oauth/linkedin", () => {
  it("isConfigured() reflects env", async () => {
    const { linkedinProvider } = await import("../../../modules/auth/providers/linkedin.js");
    expect(linkedinProvider.isConfigured()).toBe(true);
  });

  it("getAuthUrl() includes openid scope and state", async () => {
    const { linkedinProvider } = await import("../../../modules/auth/providers/linkedin.js");
    const url = linkedinProvider.getAuthUrl("S");
    expect(url).toContain("scope=openid+profile+email");
    expect(url).toContain("state=S");
  });

  it("exchangeCode() maps userinfo into a normalized profile", async () => {
    global.fetch = sequence([
      { json: { access_token: "tok" } },
      {
        json: {
          sub: "li-1",
          email: "li@example.com",
          email_verified: true,
          given_name: "Lin",
          family_name: "K",
        },
      },
    ]) as unknown as typeof fetch;
    const { linkedinProvider } = await import("../../../modules/auth/providers/linkedin.js");
    const profile = await linkedinProvider.exchangeCode("c");
    expect(profile.provider).toBe("linkedin");
    expect(profile.email).toBe("li@example.com");
  });
});

describe("oauth/registry", () => {
  it("getProvider returns undefined for unknown ids", async () => {
    const { getProvider } = await import("../../../modules/auth/providers/index.js");
    expect(getProvider("myspace")).toBeUndefined();
    expect(getProvider("google")).toBeDefined();
  });
});