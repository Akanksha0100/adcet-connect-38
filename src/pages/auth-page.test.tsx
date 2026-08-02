import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import PublicHeader from "@/components/public/PublicHeader";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn().mockResolvedValue({ items: [] }), patch: vi.fn().mockResolvedValue({}), post: vi.fn() },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const renderAt = (path: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

const signInHeading = () => screen.queryByRole("heading", { name: "Welcome Back" });
const createAccountHeading = () => screen.queryByRole("heading", { name: "Create Account" });

describe("AuthPage — one form at a time", () => {
  it("shows only the sign-in form on /login", () => {
    renderAt("/login");
    expect(signInHeading()).toBeInTheDocument();
    // The whole point of this phase: the register form is not also on screen.
    expect(createAccountHeading()).not.toBeInTheDocument();
  });

  it("shows only the sign-up form on /register", () => {
    renderAt("/register");
    expect(createAccountHeading()).toBeInTheDocument();
    expect(signInHeading()).not.toBeInTheDocument();
  });

  it("swaps to sign-up via the switch link, and back again", () => {
    renderAt("/login");

    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(createAccountHeading()).toBeInTheDocument();
    expect(signInHeading()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signInHeading()).toBeInTheDocument();
    expect(createAccountHeading()).not.toBeInTheDocument();
  });

  it("offers the switch link at desktop widths too, not just on mobile", () => {
    // Previously these carried `lg:hidden`, which was fine only because both
    // panels were on screen at once. With one panel they are the only way over.
    renderAt("/login");
    expect(screen.getByRole("button", { name: "Register" })).not.toHaveClass("lg:hidden");
  });
});

describe("public CTAs point at the right form", () => {
  it("sends 'Join Network' to sign-up and 'Sign In' to sign-in", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <PublicHeader />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: "Join Network" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });

  it("sends the landing page's join CTAs to sign-up", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );
    for (const name of [/Join the Alumni Network/, /Get Started/]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", "/register");
    }
  });
});
