import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import BackToTop from "@/components/public/BackToTop";

/**
 * React Router restores neither scroll position nor `#anchor` targets on
 * navigation, so cross-page links like `/about#board` need this nudge.
 */
function useScrollTarget() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    // Let the destination page paint before looking for the anchor.
    const t = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [pathname, hash]);
}

/** Shared chrome for every non-authenticated page. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  useScrollTarget();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <BackToTop />
    </div>
  );
}
