import type { LucideIcon } from "lucide-react";

/**
 * Generic empty-state block. Used by list pages when an API returns no items
 * or after a query fails — keeps the layout from collapsing.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="card-elevated flex flex-col items-center justify-center text-center p-10 gap-3">
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {action}
  </div>
);

export default EmptyState;
