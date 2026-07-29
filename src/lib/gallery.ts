/**
 * Photo gallery albums.
 *
 * To add photos: drop the image files into `public/gallery/<folder>/`, then add
 * the file names to the matching album's `files` array (or add a new album
 * entry). File names are URL-encoded automatically, so spaces are fine.
 */
export interface GalleryAlbum {
  slug: string;
  title: string;
  date: string;
  location?: string;
  /** Folder under `public/gallery/`. */
  folder: string;
  files: string[];
}

export const GALLERY_ALBUMS: GalleryAlbum[] = [
  {
    slug: "pune-chapter-march-2025",
    title: "Pune Chapter Meet",
    date: "1 March 2025",
    location: "COEP, Pune",
    folder: "PuneChapter1March2025",
    files: ["1.png", "COEPPune.png", "2.JPG", "3.JPG", "4.jpeg", "5.jpeg", "6.jpeg"],
  },
  {
    slug: "pune-chapter-sep-2025",
    title: "Pune Chapter Meet",
    date: "29 September 2025",
    location: "Pune",
    folder: "PuneChapter29Sep2025",
    files: ["20250928_113711AMByGPSMapCamera.jpg", "WhatsApp Image 2026-07-14 at 11.02.48 AM.jpeg"],
  },
];

/** Public URL for a photo in an album. */
export const photoUrl = (album: GalleryAlbum, file: string) =>
  encodeURI(`/gallery/${album.folder}/${file}`);

export const totalPhotos = GALLERY_ALBUMS.reduce((n, a) => n + a.files.length, 0);
