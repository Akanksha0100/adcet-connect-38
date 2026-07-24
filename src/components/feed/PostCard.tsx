import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Flag, Heart, Loader2, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/utils";
import { authorName, type Post } from "@/lib/feed";
import { PostAuthor } from "./PostAuthor";
import { PostMediaView } from "./PostMediaView";
import { ShareMenu } from "./ShareMenu";
import { CommentsSection } from "./CommentsSection";

interface Props {
  post: Post;
  /** Detail view starts with comments open and doesn't link the timestamp. */
  variant?: "feed" | "detail";
}

export const PostCard = ({ post, variant = "feed" }: Props) => {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  // Like + comment counts are tracked locally so the UI responds instantly;
  // they re-sync whenever the underlying post object changes.
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(variant === "detail");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.likedByMe, post.likeCount, post.commentCount]);

  const isAuthor = post.author.id === user?.id;
  const name = authorName(post.author);

  const like = useMutation({
    mutationFn: () => api.post<{ liked: boolean; likeCount: number }>(`/feed/${post.id}/like`),
    onMutate: () => {
      // Optimistic flip; rolled back in onError.
      setLiked((l) => !l);
      setLikeCount((c) => c + (liked ? -1 : 1));
    },
    onSuccess: (res) => {
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    },
    onError: () => {
      setLiked(post.likedByMe);
      setLikeCount(post.likeCount);
      toast({ title: "Couldn't update like", variant: "destructive" });
    },
  });

  const saveEdit = useMutation({
    mutationFn: () => api.patch<Post>(`/feed/${post.id}`, { content: editText.trim() }),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast({ title: "Post updated" });
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't save", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/feed/${post.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't delete", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  const report = useMutation({
    mutationFn: () => api.post(`/feed/${post.id}/report`, { reason: reportReason.trim() }),
    onSuccess: () => {
      setReportOpen(false);
      setReportReason("");
      toast({ title: "Reported", description: "An admin will review this post." });
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't report", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  return (
    <article className="card-elevated p-4 space-y-3 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <PostAuthor author={post.author} createdAt={post.createdAt} edited={!!post.editedAt} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Post options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAuthor && (
              <DropdownMenuItem onClick={() => { setEditText(post.content ?? ""); setEditing(true); }}>
                <Pencil className="h-4 w-4" /> Edit post
              </DropdownMenuItem>
            )}
            {(isAuthor || isAdmin) && (
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete post
              </DropdownMenuItem>
            )}
            {!isAuthor && (
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="h-4 w-4" /> Report post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={5000}
            className="min-h-[90px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={!editText.trim() || saveEdit.isPending} onClick={() => saveEdit.mutate()}>
              {saveEdit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        )
      )}

      <PostMediaView media={post.media} />

      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {likeCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
                <Heart className="h-2.5 w-2.5 fill-primary text-primary" />
              </span>
              {likeCount} {likeCount === 1 ? "like" : "likes"}
            </span>
          )}
          {commentCount > 0 && (
            <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => like.mutate()}
            aria-pressed={liked}
            className={`gap-2 ${liked ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">Like</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments((s) => !s)}
            className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comment</span>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {variant === "feed" && (
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to={`/dashboard/feed/${post.id}`}>Open</Link>
            </Button>
          )}
          <ShareMenu postId={post.id} authorName={name} />
        </div>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          postAuthorId={post.author.id}
          onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the post along with its media, likes and comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Tell the admins what's wrong with this post…"
            maxLength={500}
            className="min-h-[100px] text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button
              disabled={reportReason.trim().length < 3 || report.isPending}
              onClick={() => report.mutate()}
            >
              {report.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default PostCard;
