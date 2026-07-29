import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Fixed bottom-left button that scrolls the page back to the top. */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 left-5 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg
        flex items-center justify-center transition-all duration-300 hover:brightness-110
        ${visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"}`}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
