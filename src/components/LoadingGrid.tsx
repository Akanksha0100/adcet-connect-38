import { Skeleton } from "@/components/ui/skeleton";

/** Simple skeleton grid for list pages while data is loading. */
export const LoadingGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card-elevated p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    ))}
  </div>
);

export default LoadingGrid;
