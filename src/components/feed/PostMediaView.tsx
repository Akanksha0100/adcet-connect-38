import { storageUrl } from "@/lib/storage";
import type { PostMedia } from "@/lib/feed";

/**
 * Renders a post's attachments: a single video player, one full-width image,
 * or a two-up image grid. (Media is capped at 2 images or 1 video.)
 */
export const PostMediaView = ({ media }: { media: PostMedia[] }) => {
  if (media.length === 0) return null;

  const video = media.find((m) => m.type === "VIDEO");
  if (video) {
    return (
      <div className="bg-black rounded-xl overflow-hidden border border-border">
        <video
          src={storageUrl(video.key)}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[70vh]"
        />
      </div>
    );
  }

  const images = media.filter((m) => m.type === "IMAGE");
  return (
    <div className={`grid gap-1 rounded-xl overflow-hidden border border-border ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {images.map((m) => (
        <a key={m.id} href={storageUrl(m.key)} target="_blank" rel="noreferrer" className="block bg-muted">
          <img
            src={storageUrl(m.key)}
            alt=""
            loading="lazy"
            className={`w-full object-cover ${images.length > 1 ? "h-48 sm:h-64" : "max-h-[70vh] object-contain bg-black"}`}
          />
        </a>
      ))}
    </div>
  );
};

export default PostMediaView;
