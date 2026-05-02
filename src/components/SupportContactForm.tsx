import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const SupportContactForm = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.post("/content/support", {
        name,
        email,
        subject: subject || undefined,
        message,
      }),
    onSuccess: () => {
      toast({ title: "Message sent", description: "We'll get back to you shortly." });
      setSubject("");
      setMessage("");
    },
    onError: (e: any) =>
      toast({ title: "Failed to send", description: e?.message, variant: "destructive" }),
  });

  return (
    <form
      className="card-elevated p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name || !email || !message) return;
        submit.mutate();
      }}
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Mail className="h-4 w-4" /> Send us a message
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
        Send message
      </Button>
    </form>
  );
};

export default SupportContactForm;