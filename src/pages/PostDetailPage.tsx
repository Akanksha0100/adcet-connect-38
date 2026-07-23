import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/feed/PostCard";
import { api } from "@/lib/api";
import type { Post } from "@/lib/feed";

/**
 * Single-post view — the target of the share link. It lives under
 * /dashboard so ProtectedRoute + AccountStatusGate keep shared posts
 * readable only by signed-in, approved members.
 */
const PostDetailPage = () => {
  const { id = "" } = useParams();
  const post = useQuery({
    queryKey: ["feed", "post", id],
    queryFn: () => api.get<Post>(`/feed/${id}`),
    retry: false,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground">
        <Link to="/dashboard/feed">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
      </Button>

      {post.isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {post.isError && (
        <EmptyState
          icon={Newspaper}
          title="Post unavailable"
          description="This post may have been deleted, or you don't have access to it."
        />
      )}

      {post.data && <PostCard post={post.data} variant="detail" />}
    </motion.div>
  );
};

export default PostDetailPage;
