import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_CONTENT,
  getSiteContent,
  resetSiteContent,
  saveSiteContent,
  type SiteContent,
  type SiteContentKey,
} from "@/lib/siteContent";

const SECTIONS: { key: SiteContentKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "support", label: "Support" },
  { key: "contact", label: "Contact" },
  { key: "news", label: "News" },
  { key: "mentorship", label: "Mentorship" },
  { key: "resources", label: "Resources" },
];

const SiteContentPage = () => {
  const [content, setContent] = useState<SiteContent>(getSiteContent());

  useEffect(() => setContent(getSiteContent()), []);

  const handleSave = () => {
    saveSiteContent(content);
    toast({ title: "Site content updated" });
  };

  const handleReset = () => {
    resetSiteContent();
    setContent(DEFAULT_CONTENT);
    toast({ title: "Restored defaults" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" /> Site Content
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the copy shown on the public dashboard pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="about" className="card-elevated p-4">
        <TabsList className="flex flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.key} value={s.key} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={content[s.key].title}
                onChange={(e) =>
                  setContent({ ...content, [s.key]: { ...content[s.key], title: e.target.value } })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                rows={10}
                value={content[s.key].body}
                onChange={(e) =>
                  setContent({ ...content, [s.key]: { ...content[s.key], body: e.target.value } })
                }
              />
              <p className="text-xs text-muted-foreground">
                Plain text — line breaks are preserved on the public page.
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
};

export default SiteContentPage;