import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { BadRequest, NotFound } from "../../lib/errors.js";
import { getStorage } from "../../storage/index.js";

const photosOrdered: Prisma.GalleryAlbumInclude = {
  photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
};

/** Newest event first; albums without a date fall to the end. */
const albumOrder: Prisma.GalleryAlbumOrderByWithRelationInput[] = [
  { eventDate: "desc" },
  { createdAt: "desc" },
];

export const listAlbums = async (opts: { includeUnpublished?: boolean } = {}) => {
  const items = await prisma.galleryAlbum.findMany({
    where: opts.includeUnpublished ? {} : { isPublished: true },
    include: photosOrdered,
    orderBy: albumOrder,
  });
  return { items };
};

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Slugs must be unique, so a repeated album title gets a numeric suffix. */
const uniqueSlug = async (title: string) => {
  const base = slugify(title);
  if (!base) throw BadRequest("Could not derive a slug from that title");
  for (let n = 0; ; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    const clash = await prisma.galleryAlbum.findUnique({ where: { slug } });
    if (!clash) return slug;
  }
};

export const createAlbum = async (data: {
  title: string;
  eventDate?: Date;
  location?: string;
  isPublished?: boolean;
}) => {
  const slug = await uniqueSlug(data.title);
  return prisma.galleryAlbum.create({ data: { ...data, slug }, include: photosOrdered });
};

export const updateAlbum = async (
  id: string,
  data: { title?: string; eventDate?: Date | null; location?: string | null; isPublished?: boolean },
) => {
  const existing = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!existing) throw NotFound("Album not found");
  return prisma.galleryAlbum.update({ where: { id }, data, include: photosOrdered });
};

/**
 * Deleting an album removes its photos (FK cascade) and their stored objects.
 * Storage failures are swallowed: an orphaned object is a smaller problem than
 * an album that cannot be deleted.
 */
export const deleteAlbum = async (id: string) => {
  const album = await prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: true } });
  if (!album) return;
  await prisma.galleryAlbum.delete({ where: { id } });
  await Promise.all(album.photos.map((p) => removeObject(p.imageKey)));
};

/** Seeded photos live under `public/`, not storage — never try to delete those. */
const removeObject = async (key: string) => {
  if (key.startsWith("/")) return;
  await getStorage().delete(key).catch(() => undefined);
};

export const addPhotos = async (albumId: string, imageKeys: string[]) => {
  const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId } });
  if (!album) throw NotFound("Album not found");

  // Append after whatever is already there so the admin's order is preserved.
  const last = await prisma.galleryPhoto.findFirst({
    where: { albumId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const start = (last?.sortOrder ?? -1) + 1;

  await prisma.galleryPhoto.createMany({
    data: imageKeys.map((imageKey, i) => ({ albumId, imageKey, sortOrder: start + i })),
  });

  return prisma.galleryAlbum.findUnique({ where: { id: albumId }, include: photosOrdered });
};

export const deletePhoto = async (id: string) => {
  const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
  if (!photo) return;
  await prisma.galleryPhoto.delete({ where: { id } });
  await removeObject(photo.imageKey);
};
