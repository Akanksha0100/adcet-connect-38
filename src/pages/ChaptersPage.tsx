import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowLeft, Building2, Check, GraduationCap, Loader2, Mail, MapPin, Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_CHAPTER_ACCENT,
  chapterImage,
  fetchChapterMembers,
  fetchChapters,
  fetchMyChapterInvitations,
  respondToChapterInvitation,
  type Chapter,
} from "@/lib/chapters";

/**
 * Chapters, for members.
 *
 * Alumni see the same chapters and rosters the alumni office sees, and the one
 * thing they can change here is their own answer to an invitation addressed to
 * them: there is no join button, no invite form and no way to leave. Membership
 * still starts with an admin's invitation — this page only offers the same
 * Accept / Decline the invitation email does, for the common case where the
 * email never arrives or was cleared away. The API enforces the rest: every
 * other chapter route is admin-only, responding is checked against the
 * invitation's own `userId`, and member emails are withheld from non-admins.
 */

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

/* -------------------------------------------------------------------------- */
/*  Roster for one chapter                                                    */
/* -------------------------------------------------------------------------- */
const ChapterMembers = ({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
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
      ) : error ? (
        /* A failed request must never read as an empty chapter — say so, and
           offer the retry, rather than showing "No members yet". */
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Couldn't load this roster</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try again"}
          </Button>
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
/*  Invitations addressed to me                                               */
/* -------------------------------------------------------------------------- */
/**
 * Pending invitations, answerable here.
 *
 * The endpoint returns only this alumnus' PENDING invitations, so the panel
 * disappears once each one is answered — and renders nothing at all for the
 * many members who have none. Answering invalidates the whole `["chapters"]`
 * key: accepting changes a roster and a member count, and notifications carry
 * the invitation too.
 */
const MyInvitations = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["chapters", "invitations", "me"],
    queryFn: fetchMyChapterInvitations,
  });
  const invitations = data ?? [];

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: "ACCEPT" | "DECLINE" }) =>
      respondToChapterInvitation(id, response),
    onSuccess: (_res, { response }) => {
      toast(
        response === "ACCEPT"
          ? { title: "You're in", description: "You now appear on this chapter's roster." }
          : { title: "Invitation declined", description: "The alumni office can invite you again later." },
      );
      qc.invalidateQueries({ queryKey: ["chapters"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) =>
      toast({
        title: "Couldn't save your answer",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      }),
  });
  const busy = (id: string) => respond.isPending && respond.variables?.id === id;

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-3">
      {invitations.map((inv) => (
        <motion.div
          key={inv.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              You're invited to the {inv.chapter.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Invited by {`${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`.trim()}. Accepting moves you
              out of any chapter you're already in — you can belong to one at a time.
            </p>
            {inv.message && (
              <p className="text-xs text-foreground/80 italic mt-2 border-l-2 border-primary/30 pl-3">
                "{inv.message}"
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: inv.id, response: "ACCEPT" })}
            >
              {busy(inv.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: inv.id, response: "DECLINE" })}
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
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
          membership and will invite you when there's a chapter for you.
        </p>
      </div>

      <MyInvitations />

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
