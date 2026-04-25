/**
 * Common shape every OAuth provider returns after exchanging the auth code.
 * Keeping this normalized lets the auth service treat all providers uniformly.
 */
export interface OAuthProfile {
  provider: "google" | "linkedin" | "github";
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  /** Lowercase provider key (matches the URL slug). */
  id: OAuthProfile["provider"];
  /** True when env vars for this provider are present. */
  isConfigured(): boolean;
  /** Build the provider's authorize URL the browser should be redirected to. */
  getAuthUrl(state: string): string;
  /** Exchange the ?code= callback param for a normalized profile. */
  exchangeCode(code: string): Promise<OAuthProfile>;
}
