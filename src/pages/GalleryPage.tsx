import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, ImageIcon, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { GALLERY_ALBUMS, photoUrl, totalPhotos } from "@/lib/gallery";

interface Selection {
  album: number;
  photo: number;
}

export default function GalleryPage() {
  const [selected, setSelected] = useState<Selection | null>(null);

  const step = useCallback((dir: number) => {
    setSelected((cur) => {
      if (!cur) return cur;
      const files = GALLERY_ALBUMS[cur.album].files;
      return { ...cur, photo: (cur.photo + dir + files.length) % files.length };
    });
  }, []);

  // Arrow keys page through the open album; Escape closes the viewer.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selected, step]);

  const album = selected ? GALLERY_ALBUMS[selected.album] : null;

  return (
    <PublicLayout>
      <PageHero
        title="Gallery"
        subtitle={`Moments from alumni meets, chapter events and campus reunions — ${totalPhotos} photographs`}
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {GALLERY_ALBUMS.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Photographs will be published here soon.</p>
          </div>
        )}

        {GALLERY_ALBUMS.map((a, ai) => (
          <motion.section
            key={a.slug}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            id={a.slug}
            className="scroll-mt-24"
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-2">{a.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-5">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {a.date}
              </span>
              {a.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {a.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                {a.files.length} photos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {a.files.map((f, pi) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelected({ album: ai, photo: pi })}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Open photo ${pi + 1} of ${a.title}`}
                >
                  <img
                    src={photoUrl(a, f)}
                    alt={`${a.title} — photo ${pi + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          </motion.section>
        ))}

        <section className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Have Photos from an Alumni Event?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Share your reunion and chapter photographs with the Alumni Cell and we'll add them to the gallery.
          </p>
          <Button asChild>
            <Link to="/contact">Send Us Photos</Link>
          </Button>
        </section>
      </div>

      {/* Lightbox */}
      {album && selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${album.title} photo viewer`}
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close viewer"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {album.files.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-3 sm:left-6 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
                className="absolute right-3 sm:right-6 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={photoUrl(album, album.files[selected.photo])}
              alt={`${album.title} — photo ${selected.photo + 1}`}
              className="max-h-[78vh] w-auto mx-auto rounded-lg object-contain"
            />
            <figcaption className="text-center text-xs text-white/70 mt-4">
              {album.title} · {album.date} — {selected.photo + 1} / {album.files.length}
            </figcaption>
          </figure>
        </div>
      )}
    </PublicLayout>
  );
}
