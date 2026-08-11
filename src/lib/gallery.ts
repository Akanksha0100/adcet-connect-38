/**
 * Photo gallery albums.
 *
 * Albums and photos are managed from `/admin/gallery` and live in the database.
 * Photo keys are storage keys for anything uploaded through the admin page, or
 * a `public/` path for the albums that shipped with the site — `assetUrl()`
 * resolves both, so the public page never needs to know which is which.
 */
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/storage";

export interface GalleryPhoto {
  id: string;
  imageKey: string;
  sortOrder: number;
}

export interface GalleryAlbum {
  id: string;
  slug: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  isPublished: boolean;
  photos: GalleryPhoto[];
}

/** Public URL for a photo. */
export const photoUrl = (photo: GalleryPhoto) => assetUrl(photo.imageKey);

/** "1 March 2025" — how the alumni office writes event dates. */
export const formatEventDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

export const albumsQuery = (opts: { includeUnpublished?: boolean } = {}) => ({
  queryKey: ["gallery", "albums", opts.includeUnpublished ?? false] as const,
  queryFn: () =>
    api
      .get<{ items: GalleryAlbum[] }>(
        "/gallery/albums",
        opts.includeUnpublished ? { includeUnpublished: true } : undefined,
      )
      .then((r) => r.items),
});

/* --------------------------------- admin --------------------------------- */

export const createAlbum = (data: {
  title: string;
  eventDate?: string;
  location?: string;
  isPublished?: boolean;
}) => api.post<GalleryAlbum>("/gallery/albums", data);

export const updateAlbum = (
  id: string,
  data: { title?: string; eventDate?: string | null; location?: string | null; isPublished?: boolean },
) => api.patch<GalleryAlbum>(`/gallery/albums/${id}`, data);

export const deleteAlbum = (id: string) => api.delete(`/gallery/albums/${id}`);

/** Photos are uploaded to storage first; this records the resulting keys. */
export const addPhotos = (albumId: string, imageKeys: string[]) =>
  api.post<GalleryAlbum>(`/gallery/albums/${albumId}/photos`, { imageKeys });

export const deletePhoto = (photoId: string) => api.delete(`/gallery/photos/${photoId}`);
