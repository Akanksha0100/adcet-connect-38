import { Check, Link2, Mail, MessageCircle, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

/**
 * Share targets for a post. Every link points at `/dashboard/feed/:id`, which
 * sits behind ProtectedRoute + AccountStatusGate — so forwarding a post to an
 * outsider still requires them to sign in as an approved member to read it.
 */
export const ShareMenu = ({ postId, authorName }: { postId: string; authorName: string }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/dashboard/feed/${postId}`;
  const text = `${authorName} shared a post on ADCET Alumni Connect`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: "Only approved members can open it." });
    } catch {
      toast({ title: "Couldn't copy link", description: url, variant: "destructive" });
    }
  };

  // The OS share sheet is the best experience on mobile; offer it when present.
  const nativeShare = async () => {
    try {
      await navigator.share({ title: "ADCET Alumni Connect", text, url });
    } catch {
      /* user dismissed the sheet — nothing to do */
    }
  };

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");
  const e = encodeURIComponent;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && !!navigator.share && (
          <DropdownMenuItem onClick={nativeShare}>
            <Share2 className="h-4 w-4" /> Share via…
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open(`https://wa.me/?text=${e(`${text}\n${url}`)}`)}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://t.me/share/url?url=${e(url)}&text=${e(text)}`)}>
          <Send className="h-4 w-4" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`)}>
          <Share2 className="h-4 w-4" /> LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`mailto:?subject=${e(text)}&body=${e(url)}`)}>
          <Mail className="h-4 w-4" /> Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareMenu;
