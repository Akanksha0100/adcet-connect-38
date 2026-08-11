import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Images,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { uploadFile } from "@/lib/upload";
import {
  addPhotos,
  albumsQuery,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  formatEventDate,
  photoUrl,
  updateAlbum,
  type GalleryAlbum,
} from "@/lib/gallery";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const toDateInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const emptyForm = () => ({ title: "", eventDate: "", location: "", isPublished: true });

const failed = (e: unknown) =>
  toast({
    title: "Something went wrong",
    description: e instanceof Error ? e.message : undefined,
    variant: "destructive",
  });

/* ------------------------- album create / edit dialog ------------------------ */

const AlbumFormDialog = ({
  album,
  open,
  onOpenChange,
  onSaved,
}: {
  album: GalleryAlbum | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState(emptyForm());
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null);

  // Re-seed the fields whenever the dialog opens for a different album.
  const key = album?.id ?? "new";
  if (open && initialisedFor !== key) {
    setInitialisedFor(key);
    setForm(
      album
        ? {
            title: album.title,
            eventDate: toDateInput(album.eventDate),
            location: album.location ?? "",
            isPublished: album.isPublished,
          }
        : emptyForm(),
    );
  }
  if (!open && initialisedFor !== null) setInitialisedFor(null);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : album ? null : undefined,
        location: form.location.trim() || (album ? null : undefined),
        isPublished: form.isPublished,
      };
      return album ? updateAlbum(album.id, payload) : createAlbum(payload);
    },
    onSuccess: () => {
      toast({ title: album ? "Album updated" : "Album created" });
      onOpenChange(false);
      onSaved();
    },
    onError: failed,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{album ? "Edit album" : "New album"}</DialogTitle>
          <DialogDescription>
            An album groups the photographs from one event. Add the photos after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="album-title">Title</Label>
            <Input
              id="album-title"
              placeholder="Pune Chapter Meet"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="album-date">Event date</Label>
              <Input
                id="album-date"
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="album-location">Location</Label>
              <Input
                id="album-location"
                placeholder="Pune"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Visible on the public gallery</p>
              <p className="text-xs text-muted-foreground">
                Turn this off while you are still adding photographs.
              </p>
            </div>
            <Switch
              checked={form.isPublished}
              onCheckedChange={(isPublished) => setForm({ ...form, isPublished })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={form.title.trim().length < 2 || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : album ? "Save changes" : "Create album"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------- album card ------------------------------- */

const AlbumCard = ({ album, onEdit }: { album: GalleryAlbum; onEdit: () => void }) => {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["gallery", "albums"] });

  /** Uploads run one at a time so the progress count is honest and the browser isn't swamped. */
  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    const tooBig = picked.filter((f) => f.size > MAX_PHOTO_BYTES);
    const images = picked.filter((f) => f.type.startsWith("image/") && f.size <= MAX_PHOTO_BYTES);

    if (tooBig.length) {
      toast({
        title: `${tooBig.length} photo${tooBig.length === 1 ? "" : "s"} skipped`,
        description: "Each photograph must be 10 MB or smaller.",
        variant: "destructive",
      });
    }
    if (!images.length) {
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setUploading({ done: 0, total: images.length });
    const keys: string[] = [];
    try {
      for (const file of images) {
        keys.push(await uploadFile(file, "gallery"));
        setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
      }
      await addPhotos(album.id, keys);
      toast({ title: `${keys.length} photo${keys.length === 1 ? "" : "s"} added` });
      refresh();
    } catch (e) {
      // Whatever uploaded before the failure is still recorded, so nothing is lost.
      if (keys.length) {
        await addPhotos(album.id, keys).catch(() => undefined);
        refresh();
      }
      failed(e);
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = useMutation({
    mutationFn: (photoId: string) => deletePhoto(photoId),
    onSuccess: refresh,
    onError: failed,
  });

  const removeAlbum = useMutation({
    mutationFn: () => deleteAlbum(album.id),
    onSuccess: () => {
      toast({ title: "Album deleted" });
      refresh();
    },
    onError: failed,
  });

  const togglePublished = useMutation({
    mutationFn: () => updateAlbum(album.id, { isPublished: !album.isPublished }),
    onSuccess: refresh,
    onError: failed,
  });

  return (
    <div className="card-elevated p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground">{album.title}</h2>
            {!album.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            {album.eventDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatEventDate(album.eventDate)}
              </span>
            )}
            {album.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {album.location}
              </span>
            )}
            <span>
              {album.photos.length} photo{album.photos.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => togglePublished.mutate()}
            disabled={togglePublished.isPending}
          >
            {album.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {album.isPublished ? "Hide" : "Publish"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Edit ${album.title}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${album.title}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
        {album.photos.map((p) => (
          <div key={p.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
            <img src={photoUrl(p)} alt="" loading="lazy" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto.mutate(p.id)}
              aria-label="Remove photo"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Upload tile, sized to match the photo thumbnails. */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={!!uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[11px]">
                {uploading.done}/{uploading.total}
              </span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-[11px]">Add photos</span>
            </>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{album.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the album and all {album.photos.length} of its photographs. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeAlbum.mutate()}
            >
              Delete album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ---------------------------------- page ---------------------------------- */

const GalleryAdminPage = () => {
  const qc = useQueryClient();
  // Admins see hidden albums too, which members and visitors never do.
  const albums = useQuery(albumsQuery({ includeUnpublished: true }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryAlbum | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (album: GalleryAlbum) => {
    setEditing(album);
    setDialogOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Images className="h-5 w-5" /> Gallery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Photographs from alumni meets and chapter events, shown on the public gallery page.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> New album
        </Button>
      </div>

      {albums.isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!albums.isLoading && (albums.data?.length ?? 0) === 0 && (
        <EmptyState
          icon={Images}
          title="No albums yet"
          description="Create an album for an event, then add its photographs."
        />
      )}

      <div className="space-y-4">
        {albums.data?.map((a) => (
          <AlbumCard key={a.id} album={a} onEdit={() => openEdit(a)} />
        ))}
      </div>

      <AlbumFormDialog
        album={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["gallery", "albums"] })}
      />
    </motion.div>
  );
};

export default GalleryAdminPage;
