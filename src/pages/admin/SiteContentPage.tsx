import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Save, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DEFAULT_CONTENT, type SiteContentKey } from "@/lib/siteContent";

const SECTIONS: { key: SiteContentKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "support", label: "Support intro" },
  { key: "contact", label: "Contact" },
  { key: "news", label: "News intro" },
  { key: "mentorship", label: "Mentorship" },
  { key: "resources", label: "Resources intro" },
];

/* ----------------- Sections editor ----------------- */
const SectionEditor = ({ k }: { k: SiteContentKey }) => {
  const qc = useQueryClient();
  const fallback = DEFAULT_CONTENT[k];
  const { data, isLoading } = useQuery({
    queryKey: ["content", "section", k],
    queryFn: () => api.get<{ key: string; title: string; body: string } | null>(`/content/sections/${k}`),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    setTitle(data?.title ?? fallback.title);
    setBody(data?.body ?? fallback.body);
  }, [data, fallback]);

  const save = useMutation({
    mutationFn: () => api.put(`/content/sections/${k}`, { title, body }),
    onSuccess: () => {
      toast({ title: "Saved" });
      qc.invalidateQueries({ queryKey: ["content", "section", k] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Body</Label>
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </Button>
    </div>
  );
};

/* ----------------- News manager ----------------- */
interface NewsItem { id: string; title: string; body: string; link?: string | null; publishedAt: string }
interface ResourceItem { id: string; title: string; body: string; link?: string | null; category?: string | null }
interface Paginated<T> { items: T[] }

const NewsManager = () => {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["content", "news"],
    queryFn: () => api.get<Paginated<NewsItem>>("/content/news", { pageSize: 100 }),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.post("/content/news", { title, body, link: link || undefined }),
    onSuccess: () => {
      toast({ title: "News added" });
      setTitle(""); setBody(""); setLink("");
      qc.invalidateQueries({ queryKey: ["content", "news"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/content/news/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content", "news"] }),
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="card-elevated p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add news entry</h3>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <Input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={!title || !body || create.isPending}
          className="gap-1.5"
        >
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {list.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {(list.data?.items ?? []).map((n) => (
          <div key={n.id} className="card-elevated p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
              {n.link && (
                <a href={n.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                  {n.link} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(n.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!list.isLoading && (list.data?.items?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No news entries yet.</p>
        )}
      </div>
    </div>
  );
};

/* ----------------- Resources manager ----------------- */
const ResourcesManager = () => {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["content", "resources"],
    queryFn: () => api.get<Paginated<ResourceItem>>("/content/resources", { pageSize: 100 }),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.post("/content/resources", {
        title, body,
        link: link || undefined,
        category: category || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Resource added" });
      setTitle(""); setBody(""); setLink(""); setCategory("");
      qc.invalidateQueries({ queryKey: ["content", "resources"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/content/resources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content", "resources"] }),
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="card-elevated p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add resource</h3>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
          <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={!title || !body || create.isPending}
          className="gap-1.5"
        >
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {list.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {(list.data?.items ?? []).map((r) => (
          <div key={r.id} className="card-elevated p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                {r.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {r.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
              {r.link && (
                <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                  {r.link} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!list.isLoading && (list.data?.items?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No resources yet.</p>
        )}
      </div>
    </div>
  );
};

const SiteContentPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" /> Site Content
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage section copy, news entries and learning resources shown to alumni.
        </p>
      </div>

      <Tabs defaultValue="sections" className="card-elevated p-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="sections" className="pt-4">
          <Tabs defaultValue={SECTIONS[0].key}>
            <TabsList className="flex flex-wrap h-auto">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
              ))}
            </TabsList>
            {SECTIONS.map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <SectionEditor k={s.key} />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
        <TabsContent value="news"><NewsManager /></TabsContent>
        <TabsContent value="resources"><ResourcesManager /></TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SiteContentPage;