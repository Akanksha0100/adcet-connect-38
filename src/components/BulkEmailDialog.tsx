import { useState } from "react";
import { Loader2, Mail, Paperclip, X, Users, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/RichTextEditor";

export interface AlumniMailFilters {
  q?: string;
  company?: string;
  location?: string;
  branch?: string;
  graduationYear?: string;
  degree?: string;
  skill?: string;
}

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AlumniMailFilters;
  recipientCount: number;
}

interface Attachment {
  key: string;
  filename: string;
  size: number;
}

const MAX_ATTACHMENT_MB = 15;
const ATTACH_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,application/pdf";

const mapFilters = (f: AlumniMailFilters) => ({
  q: f.q || undefined,
  company: f.company || undefined,
  location: f.location || undefined,
  branch: f.branch || undefined,
  graduationYear: f.graduationYear || undefined,
  degree: f.degree && f.degree !== "all" ? f.degree : undefined,
  skill: f.skill || undefined,
});

const uploadAttachment = async (file: File): Promise<Attachment> => {
  const presign = await api.post<{ uploadUrl: string; key: string }>("/uploads/presign", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    scope: "email-attachment",
  });
  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return { key: presign.key, filename: file.name, size: file.size };
};

const BulkEmailDialog = ({ open, onOpenChange, filters, recipientCount }: BulkEmailDialogProps) => {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    setSubject("");
    setHtml("");
    setAttachments([]);
    setConfirming(false);
  };

  const bodyText = html.replace(/<[^>]+>/g, "").trim();
  const canSend = subject.trim().length > 0 && bodyText.length > 0 && recipientCount > 0;

  const send = useMutation({
    mutationFn: () =>
      api.post<{ recipientCount: number; sent: number; failed: number }>("/analytics/admin/alumni/email", {
        filters: mapFilters(filters),
        subject: subject.trim(),
        html,
        attachments: attachments.map((a) => ({ key: a.key, filename: a.filename })),
      }),
    onSuccess: (res) => {
      toast({
        title: "Emails sent",
        description: `Delivered to ${res.sent} of ${res.recipientCount} alumni${res.failed ? ` (${res.failed} failed)` : ""}.`,
      });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      setConfirming(false);
      toast({ title: "Send failed", description: e?.message, variant: "destructive" });
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max ${MAX_ATTACHMENT_MB} MB per file.`, variant: "destructive" });
      return;
    }
    if (attachments.length >= 10) {
      toast({ title: "Attachment limit reached", description: "Up to 10 files.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const a = await uploadAttachment(file);
      setAttachments((prev) => [...prev, a]);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!send.isPending) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Compose Email to Alumni
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            This message will be sent to{" "}
            <span className="font-semibold text-foreground">{recipientCount.toLocaleString()}</span>{" "}
            alumni matching your current filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Invitation: Annual Alumni Meet 2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <RichTextEditor value={html} onChange={setHtml} placeholder="Write your message to the alumni…" />
            <p className="text-xs text-muted-foreground">
              Tip: use <code className="rounded bg-muted px-1">{"{{name}}"}</code> or{" "}
              <code className="rounded bg-muted px-1">{"{{firstName}}"}</code> to personalize each email.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Attachments <span className="font-normal text-muted-foreground">(optional — PDF, Doc, Image; max {MAX_ATTACHMENT_MB}MB)</span></Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="bulk-email-attach"
                type="file"
                accept={ATTACH_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading || attachments.length >= 10}
                onClick={() => document.getElementById("bulk-email-attach")?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                Attach file
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachments.map((a) => (
                  <div key={a.key} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1">{a.filename}</span>
                    <span className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      className="text-destructive hover:opacity-80"
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.key !== a.key))}
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {confirming ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-foreground">
                  You are about to email <span className="font-semibold">{recipientCount.toLocaleString()}</span> alumni.
                  This cannot be undone. Continue?
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={send.isPending}>
                  Cancel
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => send.mutate()} disabled={send.isPending}>
                  {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Yes, send now
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="gap-1.5" disabled={!canSend || uploading} onClick={() => setConfirming(true)}>
                <Send className="h-4 w-4" /> Send to {recipientCount.toLocaleString()} alumni
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEmailDialog;
