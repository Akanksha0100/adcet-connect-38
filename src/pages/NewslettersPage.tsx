import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { assetUrl } from "@/lib/storage";
import { formatMonth, newslettersQuery, type Newsletter } from "@/lib/newsroom";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

/**
 * One edition. The cover is the newsletter's own first page, so the card shows
 * what the reader is about to open rather than a generic PDF icon.
 */
const EditionCard = ({ n }: { n: Newsletter }) => {
  const file = assetUrl(n.fileKey);
  const cover = assetUrl(n.coverKey);

  return (
    <motion.a
      {...fade}
      href={file}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
    >
      <div className="aspect-[1/1.414] bg-muted overflow-hidden relative">
        {cover ? (
          <img
            src={cover}
            alt={`${n.title} — cover`}
            loading="lazy"
            className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
            <Download className="h-3.5 w-3.5" /> Open PDF
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{formatMonth(n.publishedAt)}</p>
        <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
          {n.title}
        </h3>
        {n.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">{n.description}</p>
        )}
      </div>
    </motion.a>
  );
};

export default function NewslettersPage() {
  const { data, isLoading, isError } = useQuery(newslettersQuery());
  const editions = data?.items ?? [];

  return (
    <PublicLayout title="Newsletters">
      <PageHero
        title="Alumni Newsletters"
        subtitle="Alumni achievements, chapter activity and campus developments, published by the Alumni Cell"
      />

      <div className="max-w-5xl mx-auto px-6 py-14">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="text-center text-sm text-muted-foreground py-16">
            Newsletters are unavailable right now. Please try again shortly.
          </p>
        )}

        {!isLoading && !isError && editions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">
            No editions have been published yet.
          </p>
        )}

        {editions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {editions.map((n) => (
              <EditionCard key={n.id} n={n} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
