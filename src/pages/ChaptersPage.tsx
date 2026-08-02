import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Mail, MapPin, Users, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";
import {
  DEFAULT_CHAPTER_ACCENT,
  fetchChapters,
  fetchMyChapter,
  fetchMyInvitations,
  respondToInvitation,
  type ChapterInvitation,
} from "@/lib/chapters";

/**
 * Chapters as an alumnus sees them: read-only browsing, plus any invitations
 * the alumni office has sent. Membership is invite-only — there is no join
 * button — and accepting an invite moves you out of your current chapter,
 * which the confirm dialog spells out.
 */
const ChaptersPage = () => {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const highlighted = params.get("chapter");
  const [pendingSwitch, setPendingSwitch] = useState<ChapterInvitation | null>(null);

  const isAlumni = hasRole("ALUMNI");

  const chapters = useQuery({ queryKey: ["chapters"], queryFn: () => fetchChapters() });
  const mine = useQuery({ queryKey: ["chapters", "me"], queryFn: fetchMyChapter });
  const invitations = useQuery({
    queryKey: ["chapters", "invitations", "me"],
    queryFn: fetchMyInvitations,
    enabled: isAlumni,
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: "ACCEPT" | "DECLINE" }) =>
      respondToInvitation(id, response),
    onSuccess: (inv, vars) => {
      toast(
        vars.response === "ACCEPT"
          ? { title: `Welcome to the ${inv.chapter.name}`, description: "You'll now get its events and updates." }
          : { title: "Invitation declined", description: "Nothing has changed for you." },
      );
      setPendingSwitch(null);
      qc.invalidateQueries({ queryKey: ["chapters"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: any) => {
      setPendingSwitch(null);
      toast({ title: "Could not respond", description: e?.message, variant: "destructive" });
    },
  });

  const current = mine.data;
  const invites = invitations.data ?? [];

  const accept = (inv: ChapterInvitation) => {
    // Accepting while already in a chapter is a move — confirm it explicitly.
    if (current && current.id !== inv.chapterId) setPendingSwitch(inv);
    else respond.mutate({ id: inv.id, response: "ACCEPT" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Chapters</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Regional communities run by the alumni office. Membership is by invitation — if you'd like to join
          your city's chapter, contact the office and they'll send you one.
        </p>
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="space-y-3">
          {invites.map((inv) => (
            <div key={inv.id} className="card-elevated p-5 border-primary/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-primary">Chapter invitation</p>
                  </div>
                  <p className="font-semibold text-foreground">
                    You've been invited to join the {inv.chapter.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invited by {`${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`.trim() || "the alumni office"}
                    {current && current.id !== inv.chapterId && ` · accepting moves you out of the ${current.name}`}
                  </p>
                  {inv.message && (
                    <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-border pl-3">
                      "{inv.message}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={respond.isPending}
                    onClick={() => accept(inv)}
                  >
                    {respond.isPending && respond.variables?.id === inv.id && respond.variables.response === "ACCEPT" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, response: "DECLINE" })}
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {current && (
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground">Your chapter</p>
          <p className="text-lg font-semibold text-foreground">{current.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {current.memberCount.toLocaleString("en-IN")} member{current.memberCount === 1 ? "" : "s"}
            {" · "}to change or leave your chapter, contact the alumni office.
          </p>
        </div>
      )}

      {chapters.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : (chapters.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title="No chapters yet"
          description="Chapters will appear here once the alumni office creates one."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {chapters.data!.map((c) => {
            const isMine = current?.id === c.id;
            const isHighlighted = highlighted === c.slug;
            const invited = invites.some((i) => i.chapterId === c.id);
            return (
              <div
                key={c.id}
                className={`flex flex-col rounded-2xl border bg-card overflow-hidden transition-all ${
                  isMine
                    ? "border-primary shadow-md"
                    : isHighlighted
                      ? "border-primary/50"
                      : "border-border hover:border-primary/40"
                }`}
              >
                <div className={`h-24 bg-gradient-to-br ${c.accent || DEFAULT_CHAPTER_ACCENT} flex items-end p-5`}>
                  <h2 className="text-lg font-semibold text-white drop-shadow-sm">{c.name}</h2>
                </div>
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex flex-wrap gap-2">
                    {isMine && (
                      <Badge className="bg-primary/10 text-primary border-0 gap-1">
                        <Check className="h-3 w-3" /> Your chapter
                      </Badge>
                    )}
                    {invited && !isMine && (
                      <Badge variant="secondary" className="gap-1">
                        <Mail className="h-3 w-3" /> Invited
                      </Badge>
                    )}
                    {c.city && (
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <MapPin className="h-3 w-3" /> {c.city}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Users className="h-3 w-3" /> {c.memberCount.toLocaleString("en-IN")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{c.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingSwitch} onOpenChange={(o) => !o && setPendingSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to the {pendingSwitch?.chapter.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You can be part of one chapter at a time. Accepting this invitation will remove you from the{" "}
              {current?.name} and add you to the {pendingSwitch?.chapter.name}, so you'll start receiving its
              events and mail instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={respond.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingSwitch) respond.mutate({ id: pendingSwitch.id, response: "ACCEPT" });
              }}
              disabled={respond.isPending}
            >
              {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, move me"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ChaptersPage;
