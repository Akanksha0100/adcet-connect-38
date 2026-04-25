import { env } from "../../../config/env.js";
import type { OAuthProfile, OAuthProvider } from "./types.js";

const AUTH_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const EMAILS_URL = "https://api.github.com/user/emails";

const redirectUri = () => `${env.OAUTH_REDIRECT_BASE_URL}/github/callback`;

export const githubProvider: OAuthProvider = {
  id: "github",

  isConfigured: () =>
    Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.OAUTH_REDIRECT_BASE_URL),

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri(),
      scope: "read:user user:email",
      state,
      allow_signup: "true",
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code): Promise<OAuthProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID!,
        client_secret: env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri(),
      }),
    });
    if (!tokenRes.ok) throw new Error(`GitHub token exchange failed: ${await tokenRes.text()}`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const headers = {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "adcet-alumni-portal",
    };

    const userRes = await fetch(USER_URL, { headers });
    if (!userRes.ok) throw new Error(`GitHub user failed: ${await userRes.text()}`);
    const u = (await userRes.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
      avatar_url?: string;
    };

    // GitHub may not include the primary email in /user — fetch /user/emails as a fallback.
    let email = u.email ?? "";
    let emailVerified = false;
    if (!email) {
      const emailsRes = await fetch(EMAILS_URL, { headers });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary) ?? emails[0];
        email = primary?.email ?? "";
        emailVerified = Boolean(primary?.verified);
      }
    }
    if (!email) throw new Error("GitHub account has no accessible email");

    const [firstName, ...rest] = (u.name ?? u.login).split(" ");
    return {
      provider: "github",
      providerId: String(u.id),
      email,
      emailVerified,
      firstName: firstName || u.login,
      lastName: rest.join(" ") || "GitHub",
      avatarUrl: u.avatar_url,
    };
  },
};
