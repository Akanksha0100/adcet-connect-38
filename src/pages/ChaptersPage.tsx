import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, GraduationCap, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  DEFAULT_CHAPTER_ACCENT,
  chapterImage,
  fetchChapterMembers,
  fetchChapters,
  type Chapter,
} from "@/lib/chapters";

/**
 * Chapters, for members — **read-only by design**.
 *
 * Alumni see the same chapters and rosters the alumni office sees, and can do
 * nothing else with them. There is no join button, no invite form and no way to
 * leave: membership is granted by an admin's invitation and accepted from the
 * one-click links in its email, so this page never changes who belongs where.
 * The API enforces that too — every mutating chapter route is admin-only, and
 * member emails are withheld from non-admins.
 */

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

/* -------------------------------------------------------------------------- */
/*  Roster for one chapter                                                    */
/* -------------------------------------------------------------------------- */
const ChapterMembers = ({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["chapters", "members", chapter.id],
    queryFn: () => fetchChapterMembers(chapter.id),
  });
  const members = data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> All chapters
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{chapter.name}</h1>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {chapter.memberCount.toLocaleString("en-IN")} member{chapter.memberCount === 1 ? "" : "s"}
        </Badge>
        {!chapter.isActive && <Badge variant="outline">Archived</Badge>}
      </div>
      {chapter.blurb && <p className="text-sm text-muted-foreground max-w-3xl">{chapter.blurb}</p>}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="The alumni office invites alumni to a chapter; they appear here once they accept."
        />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {members.map((m) => (
            <div key={m.userId} className="flex items-start gap-3 p-4 bg-card">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {`${m.user.firstName[0] ?? ""}${m.user.lastName[0] ?? ""}`.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{fullName(m.user)}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {m.department && (
                    <span className="flex items-center gap-1 min-w-0">
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {m.department}
                        {m.graduationYear ? ` · ${m.graduationYear}` : ""}
                      </span>
                    </span>
                  )}
                  {m.currentCompany && (
                    <span className="flex items-center gap-1 min-w-0">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {m.currentRole ? `${m.currentRole}, ` : ""}
                        {m.currentCompany}
                      </span>
                    </span>
                  )}
                  {m.city && (
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.city}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Chapter grid                                                              */
/* -------------------------------------------------------------------------- */
const ChaptersPage = () => {
  const [selected, setSelected] = useState<Chapter | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chapters", "list"],
    // No `includeInactive` — archived chapters are an admin concern, and the
    // API ignores the flag for non-admins anyway.
    queryFn: () => fetchChapters(),
  });
  const chapters = data ?? [];

  if (selected) {
    // Re-read from the list so the header count stays fresh after a refetch.
    const live = chapters.find((c) => c.id === selected.id) ?? selected;
    return <ChapterMembers chapter={live} onBack={() => setSelected(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chapters</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Regional ADCET communities. Open one to see who's in it — the alumni office manages
          membership and will invite you by email.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No chapters yet"
          description="The alumni office hasn't published any regional chapters."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {chapters.map((c, i) => {
            const image = chapterImage(c);
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.06 }}
                className="group flex flex-col text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className={`relative h-28 flex items-end p-4 overflow-hidden ${
                    image ? "bg-muted" : `bg-gradient-to-br ${c.accent || DEFAULT_CHAPTER_ACCENT}`
                  }`}
                >
                  {image && (
                    <>
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    </>
                  )}
                  <h2 className="relative text-base font-semibold text-white drop-shadow-md">{c.name}</h2>
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2.5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {c.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.memberCount.toLocaleString("en-IN")} member{c.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {c.blurb && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                      {c.blurb}
                    </p>
                  )}
                  <span className="text-xs font-medium text-primary group-hover:underline mt-auto">
                    View members
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ChaptersPage;
