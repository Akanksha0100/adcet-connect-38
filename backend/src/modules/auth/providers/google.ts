import { env } from "../../../config/env.js";
import type { OAuthProfile, OAuthProvider } from "./types.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const redirectUri = () => `${env.OAUTH_REDIRECT_BASE_URL}/google/callback`;

export const googleProvider: OAuthProvider = {
  id: "google",

  isConfigured: () =>
    Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.OAUTH_REDIRECT_BASE_URL),

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code): Promise<OAuthProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) throw new Error(`Google userinfo failed: ${await userRes.text()}`);
    const u = (await userRes.json()) as {
      sub: string;
      email: string;
      email_verified: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    return {
      provider: "google",
      providerId: u.sub,
      email: u.email,
      emailVerified: Boolean(u.email_verified),
      firstName: u.given_name ?? "Google",
      lastName: u.family_name ?? "User",
      avatarUrl: u.picture,
    };
  },
};
