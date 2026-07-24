import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/utils";
import { PostAuthor } from "./PostAuthor";
import type { Paginated, PostComment } from "@/lib/feed";

interface Props {
  postId: string;
  /** Post author id — they may delete any comment on their own post. */
  postAuthorId: string;
  onCountChange?: (delta: number) => void;
}

export const CommentsSection = ({ postId, postAuthorId, onCountChange }: Props) => {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const comments = useQuery({
    queryKey: ["feed", postId, "comments"],
    queryFn: () => api.get<Paginated<PostComment>>(`/feed/${postId}/comments`, { pageSize: 100 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["feed", postId, "comments"] });

  const add = useMutation({
    mutationFn: () => api.post<PostComment>(`/feed/${postId}/comments`, { body: draft.trim() }),
    onSuccess: () => {
      setDraft("");
      invalidate();
      onCountChange?.(1);
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't comment", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => api.delete(`/feed/${postId}/comments/${commentId}`),
    onSuccess: () => {
      invalidate();
      onCountChange?.(-1);
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't delete", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  const canDelete = (c: PostComment) => isAdmin || c.user.id === user?.id || postAuthorId === user?.id;

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim() && !add.isPending) add.mutate();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          maxLength={2000}
          className="h-9 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="text-primary hover:text-primary hover:bg-primary/10"
          disabled={!draft.trim() || add.isPending}
        >
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      {comments.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}

      {comments.data?.items.map((c) => (
        <div key={c.id} className="flex items-start gap-2 group">
          <div className="flex-1 min-w-0 space-y-1">
            <PostAuthor author={c.user} createdAt={c.createdAt} size="sm" />
            <p className="text-sm text-foreground whitespace-pre-wrap break-words pl-11">
              <span className="inline-block rounded-lg bg-muted/60 px-3 py-1.5">{c.body}</span>
            </p>
          </div>
          {canDelete(c) && (
            <button
              type="button"
              onClick={() => remove.mutate(c.id)}
              aria-label="Delete comment"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentsSection;
