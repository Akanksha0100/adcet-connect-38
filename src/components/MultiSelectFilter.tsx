/**
 * Compact popover filter: a labelled button that opens a checkbox list and
 * reports how many options are ticked. Selecting nothing means "no filter",
 * which is why the trigger reads plainly ("All departments") when empty.
 */
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  /** Shown on the trigger when nothing is selected, e.g. "All departments". */
  emptyLabel: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export const MultiSelectFilter = ({ emptyLabel, options, value, onChange, className }: Props) => {
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  const label =
    value.length === 0 ? emptyLabel : value.length === 1 ? value[0] : `${value.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between gap-2 font-normal ${value.length > 0 ? "border-primary/50" : ""} ${className ?? ""}`}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            {value.length > 0 ? `${value.length} selected` : "Select any"}
          </span>
          {value.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onChange([])}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1.5 space-y-0.5" role="group" aria-label={emptyLabel}>
            {options.map((option) => {
              const checked = value.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                    checked ? "bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(option)} className="mt-0.5 shrink-0" />
                  <span>{option}</span>
                </label>
              );
            })}
            {options.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Nothing to filter by.</p>}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

/** Small pill listing the active choices, with a per-value remove button. */
export const ActiveFilterPills = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <>
    {value.map((v) => (
      <button
        key={v}
        onClick={() => onChange(value.filter((x) => x !== v))}
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1 hover:bg-primary/20 transition-colors"
      >
        <Check className="h-3 w-3" /> {v}
        <X className="h-3 w-3" />
      </button>
    ))}
  </>
);

export default MultiSelectFilter;
