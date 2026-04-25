import { googleProvider } from "./google.js";
import { githubProvider } from "./github.js";
import { linkedinProvider } from "./linkedin.js";
import type { OAuthProvider } from "./types.js";

/**
 * Provider registry. Adding a new SSO provider = drop a file in /providers
 * implementing OAuthProvider and register it here. Routes & service code
 * stay untouched.
 */
export const oauthProviders: Record<string, OAuthProvider> = {
  google: googleProvider,
  github: githubProvider,
  linkedin: linkedinProvider,
};

export const getProvider = (id: string): OAuthProvider | undefined => oauthProviders[id];

export type { OAuthProfile, OAuthProvider } from "./types.js";
