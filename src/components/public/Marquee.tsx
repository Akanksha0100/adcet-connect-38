import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Seconds for one full pass; raise it for longer rows so the pace stays even. */
  durationSec?: number;
  className?: string;
}

/**
 * Single-row ticker that glides its content right-to-left without stopping.
 * The row is rendered twice so the loop is seamless, masked at both edges, and
 * paused while the pointer is over it so a visitor can read or click a card.
 */
export default function Marquee({ children, durationSec = 40, className }: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]",
        className,
      )}
    >
      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${durationSec}s` }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
