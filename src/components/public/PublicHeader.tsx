import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PUBLIC_NAV, CONTACT } from "@/lib/site";

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-6xl h-16 px-4 sm:px-6 flex items-center gap-3">
        {/* Brand — always returns to the landing page. */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <img src="/logo.jpeg" alt="ADCET" className="w-9 h-9 rounded-lg object-cover ring-1 ring-border" />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-sm group-hover:text-primary transition-colors">ADCET Alumni Portal</span>
            <span className="hidden sm:block text-[11px] text-muted-foreground">Ashta, Dist. Sangli</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6 text-sm">
          {PUBLIC_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive(n.to) ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
          <a
            href={CONTACT.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            College Website
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">Join Network</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-8 flex flex-col gap-1 text-sm">
                {PUBLIC_NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2.5 rounded-md transition-colors ${
                      isActive(n.to) ? "bg-muted text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {n.label}
                  </Link>
                ))}
                <a
                  href={CONTACT.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                  College Website ↗
                </a>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                  Sign In
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
