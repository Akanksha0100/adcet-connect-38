import { Calendar, Video } from "lucide-react";
import { storageUrl } from "@/lib/storage";

export interface EventCardMediaEvent {
  id: string;
  title: string;
  startsAt: string | Date;
  coverKey?: string | null;
  isOnline?: boolean;
}

/**
 * The banner strip at the top of an event card.
 *
 * Shows the event's own cover image when it has one. Otherwise it *draws* a
 * banner rather than cropping a shared poster: the old approach squeezed a
 * 1200×500 artwork with baked-in lettering into an 80px strip, so every card
 * showed the same sliced-through "ALUMNI EVENTS" text.
 *
 * The generated banner leads with the date — the one thing that differs
 * between events and that people scan for — over a gradient picked
 * deterministically from the event id, so cards in a list look distinct
 * without being random on every render.
 */
const PALETTES = [
  "from-[#192841] via-[#253c5c] to-[#1b4d3d]", // brand navy → emerald
  "from-[#1b4d3d] via-[#1f6b4f] to-[#28e092]",
  "from-[#2b1e50] via-[#3d2a6b] to-[#5b3fa8]",
  "from-[#4a2513] via-[#7a3b1b] to-[#e0842c]",
  "from-[#0f3a4d] via-[#12566f] to-[#1fa3c4]",
  "from-[#4a1230] via-[#7a1f4a] to-[#d1447e]",
];

/** Stable hash → the same event always gets the same colours. */
const paletteFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
};

const EventCardMedia = ({
  event,
  className = "aspect-[3/1]",
}: {
  event: EventCardMediaEvent;
  /** Caller controls the height/ratio of the band. */
  className?: string;
}) => {
  const cover = storageUrl(event.coverKey);
  const date = new Date(event.startsAt);
  const valid = !Number.isNaN(date.getTime());

  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      {cover ? (
        <>
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Scrim keeps the date chip readable over any photo. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
        </>
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${paletteFor(event.id)}`} />
          {/* Dotted texture, drawn in CSS so there is no asset to load. */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
          {/* Oversized glyph, clipped by the band — pure decoration. */}
          <Calendar
            className="absolute -right-4 -bottom-6 h-32 w-32 text-white/10"
            strokeWidth={1.25}
            aria-hidden="true"
          />
        </>
      )}

      {/* Date chip */}
      {valid && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <div className="rounded-xl bg-white/15 px-3 py-1.5 text-center backdrop-blur-sm ring-1 ring-white/25">
            <p className="text-[10px] font-medium uppercase leading-none tracking-widest text-white/80">
              {/* en-IN abbreviates September as "Sept"; clip to three letters
                  so every month is the same width in the chip. */}
              {date.toLocaleString("en-IN", { month: "short" }).slice(0, 3)}
            </p>
            <p className="text-xl font-bold leading-tight text-white drop-shadow-sm">
              {date.getDate()}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/90 drop-shadow-sm">
              {date.toLocaleDateString("en-IN", { weekday: "long" })}
            </p>
            <p className="text-[11px] text-white/70 drop-shadow-sm">
              {date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
      )}

      {event.isOnline && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm ring-1 ring-white/25">
          <Video className="h-3 w-3" /> Online
        </span>
      )}
    </div>
  );
};

export default EventCardMedia;
