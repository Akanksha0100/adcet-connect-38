import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { storageUrl } from "@/lib/storage";
import { authorInitials, authorName, authorSubtitle, timeAgo, type FeedAuthor } from "@/lib/feed";

interface Props {
  author: FeedAuthor;
  /** When set, rendered as a "· 3h" suffix after the department/year line. */
  createdAt?: string;
  edited?: boolean;
  size?: "sm" | "md";
}

/**
 * The avatar + name + "department · year" block shown at the top-left of every
 * post and beside every comment.
 */
export const PostAuthor = ({ author, createdAt, edited, size = "md" }: Props) => {
  const subtitle = authorSubtitle(author);
  const avatar = storageUrl(author.profile?.avatarKey);
  const meta = [subtitle, createdAt && timeAgo(createdAt), edited && "edited"].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className={size === "sm" ? "h-8 w-8" : "h-11 w-11 ring-2 ring-primary/20"}>
        {avatar && <AvatarImage src={avatar} alt={authorName(author)} className="object-cover" />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {authorInitials(author)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={`font-semibold text-foreground truncate ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {authorName(author)}
        </p>
        {meta && <p className="text-xs text-muted-foreground truncate">{meta}</p>}
      </div>
    </div>
  );
};

export default PostAuthor;
