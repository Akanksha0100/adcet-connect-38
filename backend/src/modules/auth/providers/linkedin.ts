import { env } from "../../../config/env.js";
import type { OAuthProfile, OAuthProvider } from "./types.js";

// Uses LinkedIn's OpenID Connect product ("Sign In with LinkedIn using OpenID Connect").
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

const redirectUri = () => `${env.OAUTH_REDIRECT_BASE_URL}/linkedin/callback`;

export const linkedinProvider: OAuthProvider = {
  id: "linkedin",

  isConfigured: () =>
    Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET && env.OAUTH_REDIRECT_BASE_URL),

  getAuthUrl(state) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri(),
      scope: "openid profile email",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code): Promise<OAuthProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        client_id: env.LINKEDIN_CLIENT_ID!,
        client_secret: env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    if (!tokenRes.ok) throw new Error(`LinkedIn token exchange failed: ${await tokenRes.text()}`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) throw new Error(`LinkedIn userinfo failed: ${await userRes.text()}`);
    const u = (await userRes.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    return {
      provider: "linkedin",
      providerId: u.sub,
      email: u.email,
      emailVerified: Boolean(u.email_verified),
      firstName: u.given_name ?? "LinkedIn",
      lastName: u.family_name ?? "User",
      avatarUrl: u.picture,
    };
  },
};
