import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import TestimonialsSection from "./TestimonialsSection";
import TestimonialsPage from "@/pages/TestimonialsPage";
import PublicHeader from "./PublicHeader";
import { TESTIMONIALS, EXCERPT_LENGTH, excerptOf } from "@/lib/testimonials";

const renderIn = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

/** The longest quote in the data — the one that made the old cards oversized. */
const longest = [...TESTIMONIALS].sort((a, b) => b.quote.length - a.quote.length)[0];

describe("excerptOf", () => {
  it("cuts long quotes at a word boundary and closes them with an ellipsis", () => {
    const { text, truncated } = excerptOf(longest.quote);
    expect(truncated).toBe(true);
    expect(text.endsWith("...")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(EXCERPT_LENGTH + 3);
    // Never mid-word: the character before the ellipsis starts a whole word.
    expect(longest.quote.startsWith(text.slice(0, -3))).toBe(true);
  });

  it("leaves a short quote alone", () => {
    expect(excerptOf("Short and sweet.")).toEqual({ text: "Short and sweet.", truncated: false });
  });
});

describe("TestimonialsSection", () => {
  it("shows the portrait with name, batch and designation beside a shortened quote", () => {
    renderIn(<TestimonialsSection />);
    const first = TESTIMONIALS[0];

    expect(screen.getByRole("img", { name: first.name })).toHaveAttribute("src", first.photo!);
    expect(screen.getByText(first.name)).toBeInTheDocument();
    expect(screen.getByText(first.batch!)).toBeInTheDocument();
    expect(screen.getByText(first.role)).toBeInTheDocument();

    // The card carries the excerpt, never the whole quote.
    const { text } = excerptOf(first.quote);
    expect(screen.getByText(`"${text}"`)).toBeInTheDocument();
    expect(screen.queryByText(`"${first.quote}"`)).not.toBeInTheDocument();
  });

  it("sends a click on the quote to the full testimonials page", () => {
    renderIn(<TestimonialsSection />);
    const link = screen.getByRole("link", { name: `Read ${TESTIMONIALS[0].name}'s full testimonial` });
    expect(link).toHaveAttribute("href", "/testimonials");
  });
});

describe("TestimonialsPage", () => {
  it("renders every testimonial in full", () => {
    renderIn(<TestimonialsPage />);
    for (const t of TESTIMONIALS) {
      expect(screen.getByText(`"${t.quote}"`)).toBeInTheDocument();
      expect(screen.getByText(t.name)).toBeInTheDocument();
    }
    // Nothing left to click through to — the quotes are already whole.
    expect(screen.queryByText("Read full testimonial")).not.toBeInTheDocument();
  });
});

describe("public navigation", () => {
  it("has no testimonials tab — the carousel is the only way in", () => {
    const { container } = renderIn(<PublicHeader />);
    const nav = within(container);
    expect(nav.queryByRole("link", { name: /testimonial/i })).not.toBeInTheDocument();
  });
});
