import {
  Award, BookOpen, Briefcase, GraduationCap, HeartHandshake, Lightbulb,
  Medal, Trophy, type LucideIcon,
} from "lucide-react";
import { storageUrl } from "@/lib/storage";

export interface AchievementCardMediaItem {
  id: string;
  title: string;
  category?: string | null;
  imageKey?: string | null;
}

/**
 * Banner strip for an achievement card.
 *
 * Every card gets one, whether or not the author uploaded an image — without
 * that, a grid mixes tall cards with short ones and the rows never line up.
 * The drawn fallback is keyed off the category so a Publication and an Award
 * are visually distinguishable at a glance.
 */
const CATEGORY_STYLES: { match: RegExp; icon: LucideIcon; gradient: string }[] = [
  { match: /publi|paper|research|journal|book/i, icon: BookOpen, gradient: "from-[#0f3a4d] via-[#12566f] to-[#1fa3c4]" },
  { match: /promot|career|job|work|corporate/i, icon: Briefcase, gradient: "from-[#192841] via-[#253c5c] to-[#3d6ea8]" },
  { match: /academ|scholar|degree|educat|study/i, icon: GraduationCap, gradient: "from-[#2b1e50] via-[#3d2a6b] to-[#5b3fa8]" },
  { match: /sport|athlet|game|tournament|championship/i, icon: Medal, gradient: "from-[#4a2513] via-[#7a3b1b] to-[#e0842c]" },
  { match: /social|communit|volunteer|service|charit/i, icon: HeartHandshake, gradient: "from-[#4a1230] via-[#7a1f4a] to-[#d1447e]" },
  { match: /startup|innovat|patent|entrepreneur|found/i, icon: Lightbulb, gradient: "from-[#1b4d3d] via-[#1f6b4f] to-[#28e092]" },
  { match: /award|honou?r|recogni|prize/i, icon: Award, gradient: "from-[#4a3a10] via-[#7a6118] to-[#d4a72c]" },
];

const DEFAULT_STYLE = {
  icon: Trophy,
  gradient: "from-[#192841] via-[#253c5c] to-[#1b4d3d]",
};

const styleFor = (category?: string | null) => {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLES.find((s) => s.match.test(category)) ?? DEFAULT_STYLE;
};

const AchievementCardMedia = ({
  item,
  className = "aspect-[16/7]",
}: {
  item: AchievementCardMediaItem;
  /** Caller controls the height/ratio of the band. */
  className?: string;
}) => {
  const image = storageUrl(item.imageKey);
  const { icon: Icon, gradient } = styleFor(item.category);

  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      {image ? (
        <img
          src={image}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
          <Icon
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {/* Oversized echo of the same glyph, clipped by the band. */}
          <Icon
            className="absolute -right-5 -bottom-7 h-28 w-28 text-white/10"
            strokeWidth={1}
            aria-hidden="true"
          />
        </>
      )}

      {item.category && (
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
          {item.category}
        </span>
      )}
    </div>
  );
};

export default AchievementCardMedia;
