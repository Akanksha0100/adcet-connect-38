import { motion } from "framer-motion";
import { Calendar, ExternalLink, FileText, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { storageUrl } from "@/lib/storage";
import { safeExternalUrl } from "@/lib/urls";

/**
 * One achievement, rendered in full.
 *
 * Shared by the two places a single achievement is read: the in-portal page at
 * `/dashboard/achievements/:id` (inside the dashboard shell) and the public,
 * shareable page at `/achievements/:id`. Only the surroundings differ — nav,
 * back link and sign-up CTA belong to the pages, the achievement itself lives
 * here, so the two can never drift into showing different things.
 *
 * `status` and `rejectionReason` arrive only from the authenticated endpoint;
 * the moderation note therefore appears in the portal (where an author reads
 * their own submission) and never on the public page.
 */
export interface AchievementArticleData {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  occurredOn?: string | null;
  imageKey?: string | null;
  attachmentKey?: string | null;
  link?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  user?: { firstName?: string; lastName?: string } | null;
}

const authorOf = (u: AchievementArticleData["user"]) =>
  `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Alumnus";

export default function AchievementArticle({ item }: { item: AchievementArticleData }) {
  const imageUrl = storageUrl(item.imageKey);
  const attachmentUrl = storageUrl(item.attachmentKey);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated overflow-hidden"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={item.title} className="w-full max-h-96 object-cover" />
      ) : (
        <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-6xl">
          🏆
        </div>
      )}
      <div className="p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
            {item.status === "PENDING" && (
              <Badge className="text-xs bg-amber-500/15 text-amber-600 border-0">Pending review</Badge>
            )}
            {item.status === "REJECTED" && (
              <Badge className="text-xs bg-destructive/15 text-destructive border-0">Not approved</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4" /> {authorOf(item.user)}
            </span>
            {item.occurredOn && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {new Date(item.occurredOn).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
          {item.description}
        </p>

        {item.status === "REJECTED" && item.rejectionReason && (
          <p className="text-sm rounded-md bg-destructive/10 text-destructive px-3 py-2.5">
            <span className="font-medium">Not approved:</span> {item.rejectionReason}
          </p>
        )}
        {item.status === "PENDING" && (
          <p className="text-sm text-muted-foreground italic">
            Waiting for admin review — only you and the alumni office can see this.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {item.link && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={safeExternalUrl(item.link)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Related link
              </a>
            </Button>
          )}
          {attachmentUrl && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={attachmentUrl} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" /> View certificate / document
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
