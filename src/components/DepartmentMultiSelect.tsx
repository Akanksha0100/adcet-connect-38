/**
 * Checkbox picker for the departments an event or job post targets.
 *
 * Selecting nothing is a meaningful, valid state: it means "everyone", which is
 * how the API stores it too (an empty `departments` array). The header makes
 * that explicit rather than leaving an empty box looking like a missed field.
 */
import { Check, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEPARTMENTS } from "@/lib/departments";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Rendered above the list; defaults to a generic label. */
  label?: string;
  /** Explains what an empty selection means in this context. */
  allHint?: string;
  disabled?: boolean;
  id?: string;
}

export const DepartmentMultiSelect = ({
  value,
  onChange,
  label = "Departments",
  allHint = "No selection = everyone",
  disabled,
  id = "departments",
}: Props) => {
  const toggle = (dept: string) =>
    onChange(value.includes(dept) ? value.filter((d) => d !== dept) : [...value, dept]);

  const allSelected = value.length === DEPARTMENTS.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {value.length} selected
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={disabled}
            onClick={() => onChange(allSelected ? [] : [...DEPARTMENTS])}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-44 rounded-md border border-border">
        <div id={id} className="p-2 space-y-0.5" role="group" aria-label={label}>
          {DEPARTMENTS.map((dept) => {
            const checked = value.includes(dept);
            return (
              <label
                key={dept}
                className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  checked ? "bg-primary/5" : "hover:bg-muted"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(dept)}
                  className="mt-0.5 shrink-0"
                />
                <span className={checked ? "text-foreground" : "text-muted-foreground"}>{dept}</span>
              </label>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {value.length === 0 ? (
          <>
            <Users className="h-3.5 w-3.5" /> {allHint}
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5 text-primary" />
            {value.length === DEPARTMENTS.length
              ? "Every department selected"
              : `Targeting ${value.length} of ${DEPARTMENTS.length} departments`}
          </>
        )}
      </p>
    </div>
  );
};

export default DepartmentMultiSelect;
