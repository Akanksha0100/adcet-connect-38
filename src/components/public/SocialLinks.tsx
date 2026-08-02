import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * X's logo, drawn locally: lucide's `X` export is the close/cross glyph, and
 * its `Twitter` icon is the retired bird. Filled rather than stroked, matching
 * how the brand mark is actually set.
 */
const XMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const icons = {
  instagram: Instagram,
  x: XMark,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  facebook: Facebook,
} as const;

interface Props {
  /** `light` renders for dark/photographic backgrounds (hero), `muted` for the footer. */
  tone?: "light" | "muted";
  className?: string;
}

export default function SocialLinks({ tone = "muted", className }: Props) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {SOCIAL_LINKS.map((s) => {
        const Icon = icons[s.icon];
        return (
          <a
            key={s.name}
            href={s.href}
            target={s.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            aria-label={s.name}
            title={s.name}
            className={cn(
              "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
              tone === "light"
                ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                : "border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40",
            )}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}
