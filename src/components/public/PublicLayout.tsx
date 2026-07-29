import { ReactNode } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import BackToTop from "@/components/public/BackToTop";

/** Shared chrome for every non-authenticated page. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <BackToTop />
    </div>
  );
}
