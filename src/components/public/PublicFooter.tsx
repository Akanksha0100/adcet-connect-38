import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SocialLinks from "@/components/public/SocialLinks";
import { CONTACT, PUBLIC_NAV } from "@/lib/site";

export default function PublicFooter() {
  const [email, setEmail] = useState("");

  // No subscription backend yet — acknowledge and let the alumni office collect
  // addresses once the mailing list is wired up.
  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Thanks for subscribing — we'll be in touch.");
    setEmail("");
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="ADCET" className="w-10 h-10 rounded-lg object-cover ring-1 ring-border" />
            <span className="font-semibold text-sm leading-tight">
              ADCET, Ashta
              <span className="block text-[11px] font-normal text-muted-foreground">Alumni Portal</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {CONTACT.society}
            <br />
            Annasaheb Dange College of Engineering
            <br />
            and Technology, Ashta
            <span className="block mt-1.5 italic">NAAC A++ · NBA · ISO 9001:2015</span>
          </p>
          <SocialLinks />
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            {PUBLIC_NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-foreground transition-colors">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/esteemed-alumni" className="hover:text-foreground transition-colors">
                Esteemed Alumni
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Alumni Login
              </Link>
            </li>
            <li>
              <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                College Website ↗
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter — editions live on their own page; this column just subscribes. */}
        <div>
          <h4 className="font-semibold text-sm mb-4">Newsletter</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every edition of the alumni newsletter is on the{" "}
            <Link to="/newsletters" className="text-primary hover:underline">
              Newsletters
            </Link>{" "}
            page.
          </p>

          <h4 className="font-semibold text-sm mt-6 mb-3">Subscribe</h4>
          <form onSubmit={subscribe} className="flex gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address for newsletter"
              className="h-9 text-xs"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Subscribe to newsletter">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-sm mb-4">Contact</h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <a href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {CONTACT.address}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="flex flex-wrap gap-x-1.5">
                {CONTACT.phones.map((p, i) => (
                  <span key={p}>
                    <a href={`tel:+91${p}`} className="hover:text-foreground transition-colors">
                      {p}
                    </a>
                    {i < CONTACT.phones.length - 1 && " /"}
                  </span>
                ))}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-foreground transition-colors">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                <a href={`mailto:${CONTACT.directorEmail}`} className="hover:text-foreground transition-colors">
                  {CONTACT.directorEmail}
                </a>
                <span className="block text-[11px] opacity-70">Director's Office</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Globe className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {CONTACT.websiteLabel}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {CONTACT.institute}. All Rights Reserved.
          </p>
          <SocialLinks className="scale-90" />
        </div>
      </div>
    </footer>
  );
}
