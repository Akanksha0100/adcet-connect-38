import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/utils";
import {
  MEDIA_ACCEPT,
  mediaTypeOf,
  uploadPostMedia,
  validateSelection,
  type Post,
  type PostMediaType,
} from "@/lib/feed";

/** A locally-picked file plus its object-URL preview, before upload. */
interface Draft {
  file: File;
  type: PostMediaType;
  previewUrl: string;
}

export const PostComposer = ({ onCreated }: { onCreated?: (post: Post) => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "U";

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const error = validateSelection(drafts, incoming);
    if (error) {
      toast({ title: "Can't attach that", description: error, variant: "destructive" });
    } else {
      setDrafts((d) => [
        ...d,
        ...incoming.map((file) => ({
          file,
          type: mediaTypeOf(file)!,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }
    // Reset so re-picking the same file still fires onChange.
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeDraft = (index: number) =>
    setDrafts((d) => {
      URL.revokeObjectURL(d[index].previewUrl);
      return d.filter((_, i) => i !== index);
    });

  const reset = () => {
    drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setDrafts([]);
    setContent("");
  };

  const publish = useMutation({
    mutationFn: async () => {
      // Upload media first — a failed upload must not leave a half-built post.
      const media = await Promise.all(
        drafts.map(async (d) => ({
          key: await uploadPostMedia(d.file),
          type: d.type,
          mimeType: d.file.type || undefined,
        })),
      );
      return api.post<Post>("/feed", { content: content.trim() || undefined, media });
    },
    onSuccess: (post) => {
      reset();
      qc.invalidateQueries({ queryKey: ["feed"] });
      onCreated?.(post);
      toast({ title: "Posted", description: "Your post is live in the feed." });
    },
    onError: (err: unknown) =>
      toast({ title: "Couldn't post", description: errorMessage(err, "Please try again"), variant: "destructive" }),
  });

  const empty = !content.trim() && drafts.length === 0;
  const hasVideo = drafts.some((d) => d.type === "VIDEO");

  return (
    <div className="card-elevated p-4 space-y-3 border-t-2 border-t-primary/60">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an update with the alumni network…"
          maxLength={5000}
          className="min-h-[80px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm"
        />
      </div>

      {drafts.length > 0 && (
        <div className={`grid gap-2 ${drafts.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {drafts.map((d, i) => (
            <div key={d.previewUrl} className="relative rounded-lg overflow-hidden border border-border bg-muted">
              {d.type === "VIDEO" ? (
                <video src={d.previewUrl} className="w-full h-48 object-cover" muted />
              ) : (
                <img src={d.previewUrl} alt="" className="w-full h-48 object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeDraft(i)}
                aria-label="Remove attachment"
                className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 hover:bg-background transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <input
            ref={fileInput}
            type="file"
            accept={MEDIA_ACCEPT}
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => fileInput.current?.click()}
            disabled={publish.isPending}
          >
            {hasVideo ? <Video className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            Photo / Video
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:inline">2 images or 1 video · 10 MB each</span>
        </div>
        <Button size="sm" onClick={() => publish.mutate()} disabled={empty || publish.isPending}>
          {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Post
        </Button>
      </div>
    </div>
  );
};

export default PostComposer;
