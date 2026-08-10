import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive, ArchiveRestore, Building2, Loader2, Mail, MapPin, Pencil, Plus, Search,
  Trash2, UserMinus, UserPlus, Users, X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import BulkEmailDialog from "@/components/BulkEmailDialog";
import {
  DEFAULT_CHAPTER_ACCENT, cancelChapterInvitation, chapterImage, deleteChapter, fetchChapterInvitations,
  fetchChapterMembers, fetchChapters, inviteToChapter, removeChapterMember, type Chapter,
} from "@/lib/chapters";

/** Row shape from the admin alumni search, used by the invite picker. */
interface AlumniSearchRow {
  userId: string;
  department?: string | null;
  graduationYear?: number | null;
  user: { firstName: string; lastName: string; email: string };
  chapter?: { id: string; name: string } | null;
}

const emptyForm = () => ({ name: "", city: "", blurb: "" });

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

/* -------------------------------------------------------------------------- */
/*  Manage-members dialog: invite alumni, track pending invites, remove.      */
/* -------------------------------------------------------------------------- */
const ManageMembersDialog = ({
  chapter, onClose,
}: {
  chapter: Chapter;
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [message, setMessage] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const members = useQuery({
    queryKey: ["chapters", "members", chapter.id],
    queryFn: () => fetchChapterMembers(chapter.id),
  });
  const invitations = useQuery({
    queryKey: ["chapters", "invitations", chapter.id],
    queryFn: () => fetchChapterInvitations(chapter.id),
  });
  const candidates = useQuery({
    queryKey: ["chapters", "invite-search", debounced],
    queryFn: () =>
      api
        .get<{ items: AlumniSearchRow[] }>("/analytics/admin/alumni", { q: debounced, pageSize: 20 })
        .then((r) => r.items),
    enabled: debounced.length >= 2,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["chapters"] });
  };

  const invite = useMutation({
    mutationFn: (userId: string) => inviteToChapter(chapter.id, userId, message),
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `They'll get an email and an in-app notification, and join the ${chapter.name} once they accept.`,
      });
      refresh();
    },
    onError: (e: any) => toast({ title: "Could not invite", description: e?.message, variant: "destructive" }),
  });

  const cancelInvite = useMutation({
    mutationFn: (invitationId: string) => cancelChapterInvitation(invitationId),
    onSuccess: () => {
      toast({ title: "Invitation withdrawn" });
      refresh();
    },
    onError: (e: any) => toast({ title: "Could not withdraw", description: e?.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => removeChapterMember(chapter.id, userId),
    onSuccess: () => {
      toast({ title: "Member removed", description: "Their account and history are untouched." });
      setRemoveTarget(null);
      refresh();
    },
    onError: (e: any) => {
      setRemoveTarget(null);
      toast({ title: "Could not remove", description: e?.message, variant: "destructive" });
    },
  });

  const memberRows = members.data ?? [];
  const pending = (invitations.data ?? []).filter((i) => i.status === "PENDING");
  const memberIds = new Set(memberRows.map((m) => m.userId));
  const pendingIds = new Set(pending.map((i) => i.userId));

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{chapter.name} — members</DialogTitle>
            <DialogDescription>
              Invite alumni to this chapter. They receive an email and a notification, and become members only
              once they accept.
            </DialogDescription>
          </DialogHeader>

          {/* Invite picker */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Label className="text-sm font-medium">Invite an alumnus</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search alumni by name, email or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Textarea
              rows={2}
              placeholder="Optional note to include in the invitation email…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {debounced.length >= 2 && (
              <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {candidates.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                ) : (candidates.data?.length ?? 0) === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No alumni match "{debounced}".</p>
                ) : (
                  candidates.data!.map((a) => {
                    const isMember = memberIds.has(a.userId);
                    const isPending = pendingIds.has(a.userId);
                    return (
                      <div key={a.userId} className="flex items-center gap-3 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{fullName(a.user)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.user.email}
                            {a.department ? ` · ${a.department}` : ""}
                            {a.graduationYear ? ` · ${a.graduationYear}` : ""}
                          </p>
                          {a.chapter && a.chapter.id !== chapter.id && (
                            <p className="text-[11px] text-amber-600 mt-0.5">
                              Currently in the {a.chapter.name} — accepting will move them
                            </p>
                          )}
                        </div>
                        {isMember ? (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Member</Badge>
                        ) : isPending ? (
                          <Badge variant="outline" className="text-[10px] shrink-0">Invited</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            disabled={invite.isPending}
                            onClick={() => invite.mutate(a.userId)}
                          >
                            {invite.isPending && invite.variables === a.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            Invite
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Awaiting response ({pending.length})
              </h3>
              <div className="rounded-md border border-border divide-y divide-border">
                {pending.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{fullName(i.user)}</p>
                      <p className="text-xs text-muted-foreground truncate">{i.user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground shrink-0"
                      disabled={cancelInvite.isPending}
                      onClick={() => cancelInvite.mutate(i.id)}
                    >
                      <X className="h-3.5 w-3.5" /> Withdraw
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current members */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Members ({memberRows.length})</h3>
            {members.isLoading ? (
              <LoadingGrid count={2} />
            ) : memberRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
                Nobody has joined yet. Invite alumni above.
              </p>
            ) : (
              <div className="rounded-md border border-border divide-y divide-border">
                {memberRows.map((m) => (
                  <div key={m.userId} className="flex items-center gap-3 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{fullName(m.user)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.user.email}
                        {m.department ? ` · ${m.department}` : ""}
                        {m.graduationYear ? ` · ${m.graduationYear}` : ""}
                        {m.currentCompany ? ` · ${m.currentCompany}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive shrink-0"
                      onClick={() => setRemoveTarget({ userId: m.userId, name: fullName(m.user) })}
                    >
                      <UserMinus className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name} from the {chapter.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their account, profile and history stay exactly as they are — they just stop being a member of
              this chapter and will no longer receive its events or mail. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeTarget) removeMember.mutate(removeTarget.userId);
              }}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* -------------------------------------------------------------------------- */
const ChaptersAdminPage = () => {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [archiveTarget, setArchiveTarget] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [managing, setManaging] = useState<Chapter | null>(null);
  const [mailTarget, setMailTarget] = useState<Chapter | null>(null);

  // Admins see archived chapters too, so a retired one can be restored.
  const chapters = useQuery({
    queryKey: ["chapters", "admin"],
    queryFn: () => fetchChapters({ includeInactive: true }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["chapters"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        blurb: form.blurb.trim() || null,
      };
      return editing ? api.patch(`/chapters/${editing.id}`, body) : api.post("/chapters", body);
    },
    onSuccess: () => {
      toast({ title: editing ? "Chapter updated" : "Chapter created" });
      setFormOpen(false);
      invalidate();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/chapters/${id}`, { isActive }),
    onSuccess: (_d, vars) => {
      toast({
        title: vars.isActive ? "Chapter restored" : "Chapter archived",
        description: vars.isActive
          ? "It is visible again and can take new members."
          : "Its members and events are untouched — it is just hidden and closed to new invitations.",
      });
      setArchiveTarget(null);
      invalidate();
    },
    onError: (e: any) => {
      setArchiveTarget(null);
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteChapter(id),
    onSuccess: () => {
      toast({ title: "Chapter deleted" });
      setDeleteTarget(null);
      invalidate();
    },
    // A 409 here is the "not empty" guard — surface its explanation verbatim.
    onError: (e: any) =>
      toast({ title: "Could not delete", description: e?.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (c: Chapter) => {
    setEditing(c);
    setForm({ name: c.name, city: c.city ?? "", blurb: c.blurb ?? "" });
    setFormOpen(true);
  };

  const rows = chapters.data ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chapters</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Regional alumni communities. You invite alumni to a chapter and they join once they accept. A
            chapter can only be deleted while empty — otherwise archive it to retire it without losing anything.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New Chapter
        </Button>
      </div>

      {chapters.isLoading ? (
        <LoadingGrid count={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="No chapters yet" description="Create the first regional chapter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((c) => (
            <div
              key={c.id}
              className={`card-elevated overflow-hidden flex flex-col ${c.isActive ? "" : "opacity-70"}`}
            >
              {/* Same city photograph the public cards use, so admins see what alumni see. */}
              {chapterImage(c) ? (
                <img src={chapterImage(c)} alt="" aria-hidden="true" className="h-16 w-full object-cover" />
              ) : (
                <div className={`h-16 bg-gradient-to-br ${c.accent || DEFAULT_CHAPTER_ACCENT}`} />
              )}
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground truncate">{c.name}</h2>
                  </div>
                  {!c.isActive && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {c.city && (
                    <Badge variant="outline" className="gap-1 font-normal text-[10px]">
                      <MapPin className="h-3 w-3" /> {c.city}
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 font-normal text-[10px]">
                    <Users className="h-3 w-3" /> {c.memberCount.toLocaleString("en-IN")} members
                  </Badge>
                </div>

                {c.blurb && <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{c.blurb}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setManaging(c)}>
                    <Users className="h-3.5 w-3.5" /> Members
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={c.memberCount === 0}
                    onClick={() => setMailTarget(c)}
                  >
                    <Mail className="h-3.5 w-3.5" /> Send mail
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {c.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => setArchiveTarget(c)}
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ id: c.id, isActive: true })}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New Chapter"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "The chapter's URL slug is fixed once created so existing links keep working."
                : "The URL slug is derived from the name."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                required
                placeholder="e.g. Hyderabad Chapter"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Shown on the public chapters section."
                value={form.blurb}
                onChange={(e) => setForm({ ...form, blurb: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Chapters for cities with a photograph in <code>public/Chapters/</code> show it on their card; the rest
              fall back to a plain header.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending || !form.name.trim()}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Create chapter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {managing && <ManageMembersDialog chapter={managing} onClose={() => setManaging(null)} />}

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive the {archiveTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing is lost: its {archiveTarget?.memberCount.toLocaleString("en-IN")} member
              {archiveTarget?.memberCount === 1 ? "" : "s"} and past events stay exactly as they are, and you can
              still filter and mail them. Archiving hides the chapter from the public page and closes it to new
              invitations. You can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setActive.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (archiveTarget) setActive.mutate({ id: archiveTarget.id, isActive: false });
              }}
              disabled={setActive.isPending}
            >
              {setActive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Archive chapter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation — the server enforces the empty-only rule. */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.memberCount > 0 ? (
                <>
                  This chapter still has {deleteTarget.memberCount.toLocaleString("en-IN")} member
                  {deleteTarget.memberCount === 1 ? "" : "s"}, so it cannot be deleted — removing it would orphan
                  them. Remove the members first, or <strong>archive</strong> it instead to retire it while
                  keeping everything intact.
                </>
              ) : (
                <>
                  This permanently removes the chapter. It only works while the chapter is empty — if it still
                  has any events, the server will refuse and you can archive it instead. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) del.mutate(deleteTarget.id);
              }}
              disabled={del.isPending || (deleteTarget?.memberCount ?? 0) > 0}
            >
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mailTarget && (
        <BulkEmailDialog
          open={!!mailTarget}
          onOpenChange={(o) => !o && setMailTarget(null)}
          filters={{ chapterId: mailTarget.id }}
          recipientCount={mailTarget.memberCount}
        />
      )}
    </motion.div>
  );
};

export default ChaptersAdminPage;
