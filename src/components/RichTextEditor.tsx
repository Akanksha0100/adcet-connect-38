import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
} from "lucide-react";

/**
 * Dependency-free rich text editor built on a contentEditable surface and
 * `document.execCommand`. Emits clean-ish HTML via `onChange`. Deliberately
 * lightweight — no external editor library or CSS.
 */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

type Cmd = { icon: typeof Bold; label: string; run: () => void };

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Initialize / sync only when the incoming value diverges from the DOM
  // (prevents caret jumps while typing).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Enter the URL (including https://)");
    if (url) exec("createLink", url);
  };

  const groups: Cmd[][] = [
    [
      { icon: Bold, label: "Bold", run: () => exec("bold") },
      { icon: Italic, label: "Italic", run: () => exec("italic") },
      { icon: Underline, label: "Underline", run: () => exec("underline") },
    ],
    [
      { icon: Heading2, label: "Heading", run: () => exec("formatBlock", "<h2>") },
      { icon: Heading3, label: "Subheading", run: () => exec("formatBlock", "<h3>") },
    ],
    [
      { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
      { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    ],
    [
      { icon: AlignLeft, label: "Align left", run: () => exec("justifyLeft") },
      { icon: AlignCenter, label: "Align center", run: () => exec("justifyCenter") },
      { icon: AlignRight, label: "Align right", run: () => exec("justifyRight") },
    ],
    [
      { icon: Link2, label: "Insert link", run: addLink },
      { icon: Eraser, label: "Clear formatting", run: () => exec("removeFormat") },
    ],
  ];

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

  return (
    <div className={`rounded-lg border border-input bg-background overflow-hidden ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-border" />}
            {group.map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                title={cmd.label}
                aria-label={cmd.label}
                // preventDefault keeps the editor selection while clicking.
                onMouseDown={(e) => e.preventDefault()}
                onClick={cmd.run}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <cmd.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          onInput={emit}
          onBlur={emit}
          role="textbox"
          aria-multiline="true"
          className="prose-editor min-h-[220px] max-h-[420px] overflow-y-auto px-3 py-3 text-sm text-foreground focus:outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline"
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
