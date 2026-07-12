/**
 * Auth context. Source of truth for the current user, role, and login/logout
 * operations. Wired into the API client via the `adcet:auth-expired` event so
 * a 401 anywhere in the app cleanly signs the user out.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  tokenStore,
  type AppRole,
  type AuthTokens,
  type AuthUser,
} from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (...roles: AppRole[]) => boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Persist tokens captured from an external flow (e.g. OAuth fragment). */
  setSession: (tokens: AuthTokens) => Promise<AuthUser>;
  refreshMe: () => Promise<AuthUser | null>;
}

export interface RegisterInput {
  email: string;
  password: string;
  /** 6-digit email verification code from POST /auth/register/send-otp. */
  otp: string;
  firstName: string;
  lastName: string;
  department?: string;
  degree?: "BE" | "ME" | "PHD" | "DIPLOMA";
  admissionYear?: number;
  graduationYear?: number;
  role?: "ALUMNI" | "STUDENT" | "RECRUITER";
  // Step 2 fields
  linkedinUrl: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  phone?: string;
  city?: string;
  bio?: string;
  currentCompany?: string;
  currentRole?: string;
}

const AuthCtx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStore.get()?.user ?? null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // Hydrate: if we have a token, ask the server who we are. This catches
  // stale users (status changed, roles updated) on page reload.
  useEffect(() => {
    mounted.current = true;
    const tokens = tokenStore.get();
    if (!tokens) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>("/auth/me")
      .then((me) => {
        if (!mounted.current) return;
        setUser(me);
        // Keep cached tokens in sync with fresh user payload.
        tokenStore.set({ ...tokens, user: me });
      })
      .catch(() => {
        if (!mounted.current) return;
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, []);

  // React to global auth expiry from the API client.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("adcet:auth-expired", onExpired);
    return () => window.removeEventListener("adcet:auth-expired", onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.post<AuthTokens>("/auth/login", { email, password }, { anonymous: true });
    tokenStore.set(tokens);
    setUser(tokens.user);
    return tokens.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const tokens = await api.post<AuthTokens>("/auth/register", input, { anonymous: true });
    tokenStore.set(tokens);
    setUser(tokens.user);
    return tokens.user;
  }, []);

  const logout = useCallback(async () => {
    const tokens = tokenStore.get();
    try {
      if (tokens?.refreshToken) {
        await api.post("/auth/logout", { refreshToken: tokens.refreshToken });
      }
    } catch {
      // Best-effort — we still clear locally.
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const setSession = useCallback(async (tokens: AuthTokens) => {
    tokenStore.set(tokens);
    // The /me call ensures we have a fresh, authoritative user payload.
    const me = await api.get<AuthUser>("/auth/me");
    tokenStore.set({ ...tokens, user: me });
    setUser(me);
    return me;
  }, []);

  const refreshMe = useCallback(async () => {
    if (!tokenStore.get()) return null;
    const me = await api.get<AuthUser>("/auth/me");
    setUser(me);
    return me;
  }, []);

  const value = useMemo<AuthState>(() => {
    const roles = user?.roles ?? [];
    return {
      user,
      loading,
      isAuthenticated: !!user,
      hasRole: (...allowed: AppRole[]) => allowed.some((r) => roles.includes(r)),
      isAdmin: roles.includes("ADMIN"),
      login,
      register,
      logout,
      setSession,
      refreshMe,
    };
  }, [user, loading, login, register, logout, setSession, refreshMe]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
