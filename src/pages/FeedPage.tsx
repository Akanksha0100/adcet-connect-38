import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { api } from "@/lib/api";
import type { Paginated, Post } from "@/lib/feed";

const PAGE_SIZE = 10;

const FeedSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    ))}
  </div>
);

/**
 * The alumni feed — the default landing page after sign-in. Posts publish
 * immediately (no admin approval); the whole route is approved-members-only.
 */
const FeedPage = () => {
  const feed = useInfiniteQuery({
    queryKey: ["feed", "list"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<Post>>("/feed", { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });

  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl hero-gradient shadow-sm">
          <Newspaper className="h-5 w-5 text-primary-foreground" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gradient leading-tight">Feed</h1>
          <p className="text-muted-foreground text-sm">What's happening across the alumni network</p>
        </div>
      </div>

      <PostComposer onCreated={() => feed.refetch()} />

      {feed.isLoading && <FeedSkeleton />}

      {!feed.isLoading && posts.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Be the first to share something with your fellow alumni."
        />
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {feed.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
            {feed.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default FeedPage;
