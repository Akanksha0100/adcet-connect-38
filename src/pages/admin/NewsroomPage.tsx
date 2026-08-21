import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  FileText,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { assetUrl } from "@/lib/storage";
import { renderPdfCover } from "@/lib/pdfCover";
import { formatMonth, newsQuery, newslettersQuery, type NewsItem, type Newsletter } from "@/lib/newsroom";
import { safeExternalUrl } from "@/lib/urls";

/** `<input type="date">` wants `YYYY-MM-DD`; the API speaks ISO. */
const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const todayInput = () => new Date().toISOString().slice(0, 10);

const failed = (e: unknown) =>
  toast({
    title: "Something went wrong",
    description: e instanceof Error ? e.message : undefined,
    variant: "destructive",
  });

/* ------------------------------- News ------------------------------- */

const emptyNews = () => ({ title: "", tag: "", body: "", link: "", publishedAt: todayInput() });

const NewsManager = () => {
  const qc = useQueryClient();
  const list = useQuery(newsQuery());
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState(emptyNews());

  const reset = () => {
    setEditing(null);
    setForm(emptyNews());
  };

  const startEdit = (n: NewsItem) => {
    setEditing(n);
    setForm({
      title: n.title,
      tag: n.tag ?? "",
      body: n.body,
      link: n.link ?? "",
      publishedAt: toDateInput(n.publishedAt),
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        tag: form.tag.trim() || (editing ? null : undefined),
        link: form.link.trim() || (editing ? null : undefined),
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      };
      return editing
        ? api.patch(`/content/news/${editing.id}`, payload)
        : api.post("/content/news", payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "News updated" : "News published" });
      reset();
      qc.invalidateQueries({ queryKey: ["content", "news"] });
    },
    onError: failed,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/content/news/${id}`),
    onSuccess: () => {
      toast({ title: "News removed" });
      reset();
      qc.invalidateQueries({ queryKey: ["content", "news"] });
    },
    onError: failed,
  });

  const canSave = form.title.trim().length >= 2 && form.body.trim().length >= 2;

  return (
    <div className="space-y-5 pt-4">
      <div className="card-elevated p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {editing ? "Edit announcement" : "Add announcement"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="news-title">Headline</Label>
            <Input
              id="news-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="NAAC A++ Reaffirmation"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-tag">Tag</Label>
            <Input
              id="news-tag"
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              placeholder="Placements"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="news-body">Body</Label>
          <Textarea
            id="news-body"
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="news-link">Link (optional)</Label>
            <Input
              id="news-link"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://www.adcet.ac.in"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-date">Published</Label>
            <Input
              id="news-date"
              type="date"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="gap-1.5">
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : editing ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {editing ? "Save changes" : "Publish"}
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Published entries appear on the public News page and on every member's dashboard.
        </p>
      </div>

      <div className="space-y-2">
        {list.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {(list.data?.items ?? []).map((n) => (
          <div key={n.id} className="card-elevated p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {n.tag && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {n.tag}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatMonth(n.publishedAt)}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-1">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
              {n.link && (
                <a
                  href={safeExternalUrl(n.link)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {n.link} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex shrink-0">
              <Button size="icon" variant="ghost" onClick={() => startEdit(n)} aria-label={`Edit ${n.title}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => del.mutate(n.id)}
                aria-label={`Delete ${n.title}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {!list.isLoading && (list.data?.items?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </div>
    </div>
  );
};

/* ---------------------------- Newsletters ---------------------------- */

const emptyNewsletter = () => ({ title: "", description: "", publishedAt: todayInput() });

const NewsletterManager = () => {
  const qc = useQueryClient();
  const list = useQuery(newslettersQuery());
  const fileInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [form, setForm] = useState(emptyNewsletter());
  const [pdf, setPdf] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // Object URLs are leaked memory until revoked.
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const clearFile = () => {
    setPdf(null);
    setCover(null);
    setCoverPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyNewsletter());
    clearFile();
  };

  const startEdit = (n: Newsletter) => {
    setEditing(n);
    setForm({
      title: n.title,
      description: n.description ?? "",
      publishedAt: toDateInput(n.publishedAt),
    });
    clearFile();
  };

  /** Picking a PDF renders its first page immediately, so the admin sees the cover before saving. */
  const onPickPdf = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Pick a PDF", description: "Newsletters are published as PDF files.", variant: "destructive" });
      return;
    }
    setPdf(file);
    if (!form.title.trim()) setForm((f) => ({ ...f, title: file.name.replace(/\.pdf$/i, "") }));
    setRendering(true);
    try {
      const rendered = await renderPdfCover(file);
      setCover(rendered);
      setCoverPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(rendered);
      });
    } catch (e) {
      setCover(null);
      toast({
        title: "Could not render the cover",
        description:
          e instanceof Error ? `${e.message}. The PDF will be published without a cover image.` : undefined,
        variant: "destructive",
      });
    } finally {
      setRendering(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      let fileKey: string | undefined;
      let coverKey: string | null | undefined;
      if (pdf) {
        fileKey = await uploadFile(pdf, "newsletter");
        coverKey = cover ? await uploadFile(cover, "newsletter-cover") : null;
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || (editing ? null : undefined),
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        ...(fileKey ? { fileKey, coverKey } : {}),
      };
      return editing
        ? api.patch(`/content/newsletters/${editing.id}`, payload)
        : api.post("/content/newsletters", payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Newsletter updated" : "Newsletter published" });
      reset();
      qc.invalidateQueries({ queryKey: ["content", "newsletters"] });
    },
    onError: failed,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/content/newsletters/${id}`),
    onSuccess: () => {
      toast({ title: "Newsletter removed" });
      reset();
      qc.invalidateQueries({ queryKey: ["content", "newsletters"] });
    },
    onError: failed,
  });

  // A new edition needs its PDF; an edit may just be fixing the title.
  const canSave = form.title.trim().length >= 2 && (editing ? true : !!pdf) && !rendering;

  return (
    <div className="space-y-5 pt-4">
      <div className="card-elevated p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {editing ? `Edit "${editing.title}"` : "Publish an edition"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4">
          {/* Cover preview */}
          <div className="w-32 shrink-0">
            <div className="aspect-[1/1.414] rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
              {rendering ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover object-top" />
              ) : editing?.coverKey ? (
                <img
                  src={assetUrl(editing.coverKey)}
                  alt={`${editing.title} cover`}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <FileText className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              {rendering ? "Rendering page 1…" : "Cover — page 1"}
            </p>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="nl-file">{editing ? "Replace PDF (optional)" : "Newsletter PDF"}</Label>
              <Input
                id="nl-file"
                ref={fileInput}
                type="file"
                accept="application/pdf"
                onChange={(e) => onPickPdf(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                The first page is rendered here in your browser and published as the cover — nothing else to upload.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-title">Title</Label>
              <Input
                id="nl-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Synergy — 3rd Edition"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-desc">Description (optional)</Label>
              <Textarea
                id="nl-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this edition covers."
              />
            </div>
            <div className="space-y-1.5 max-w-[220px]">
              <Label htmlFor="nl-date">Published</Label>
              <Input
                id="nl-date"
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="gap-1.5">
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : editing ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {editing ? "Save changes" : "Publish edition"}
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {(list.data?.items ?? []).map((n) => (
          <div key={n.id} className="card-elevated p-4 flex items-start gap-3">
            <a
              href={assetUrl(n.fileKey)}
              target="_blank"
              rel="noreferrer"
              className="w-16 shrink-0 aspect-[1/1.414] rounded border border-border bg-muted overflow-hidden flex items-center justify-center"
            >
              {n.coverKey ? (
                <img
                  src={assetUrl(n.coverKey)}
                  alt={`${n.title} cover`}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground/40" />
              )}
            </a>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{formatMonth(n.publishedAt)}</p>
              <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
              {n.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.description}</p>
              )}
              <div className="flex mt-1 -ml-2">
                <Button size="icon" variant="ghost" onClick={() => startEdit(n)} aria-label={`Edit ${n.title}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => del.mutate(n.id)}
                  aria-label={`Delete ${n.title}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!list.isLoading && (list.data?.items?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No editions published yet.</p>
        )}
      </div>
    </div>
  );
};

/* ------------------------------- Page ------------------------------- */

const NewsroomPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Newspaper className="h-5 w-5" /> Newsroom
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Announcements and newsletter editions. Anything published here goes live on the public site immediately.
      </p>
    </div>

    <Tabs defaultValue="news" className="card-elevated p-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="news">News</TabsTrigger>
        <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
      </TabsList>
      <TabsContent value="news">
        <NewsManager />
      </TabsContent>
      <TabsContent value="newsletters">
        <NewsletterManager />
      </TabsContent>
    </Tabs>
  </motion.div>
);

export default NewsroomPage;
