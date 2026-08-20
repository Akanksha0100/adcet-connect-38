/**
 * An expandable sidebar section — one heading with a list of child links.
 *
 * Used by both `DashboardLayout` and `AdminLayout` so the two sidebars keep
 * identical link styling; only the items differ. The group starts open when the
 * current route is already inside it, so landing on a child link by URL never
 * shows a collapsed parent hiding where you are.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";

export interface SidebarNavGroupItem {
  label: string;
  path: string;
  /** Rendered as a pill on the right, e.g. a pending count. */
  badge?: string;
}

interface Props {
  label: string;
  icon: LucideIcon;
  /** Route prefix that counts as "inside this group". */
  basePath: string;
  items: SidebarNavGroupItem[];
}

export const SidebarNavGroup = ({ label, icon: Icon, basePath, items }: Props) => {
  const { pathname } = useLocation();
  const inside = pathname.startsWith(basePath);
  const [open, setOpen] = useState(inside);

  // Navigating into the group from elsewhere (a notification link, say) opens it.
  useEffect(() => {
    if (inside) setOpen(true);
  }, [inside]);

  const total = items.reduce((sum, i) => sum + (Number(i.badge) || 0), 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
          inside
            ? "text-primary font-medium bg-primary/5"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {!open && total > 0 && (
          <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] h-5 min-w-[20px] justify-center">
            {total > 99 ? "99+" : total}
          </Badge>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] h-5 min-w-[20px] justify-center">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarNavGroup;
