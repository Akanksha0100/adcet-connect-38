import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const icons = { instagram: Instagram, twitter: Twitter, linkedin: Linkedin, facebook: Facebook } as const;

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
