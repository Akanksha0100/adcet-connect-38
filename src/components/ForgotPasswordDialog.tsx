import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = "" }: ForgotPasswordDialogProps) => {
  const [email, setEmail] = useState(defaultEmail);

  const submit = useMutation({
    mutationFn: () => api.post("/auth/forgot-password", { email }, { anonymous: true }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) submit.reset(); }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Reset your password
          </DialogTitle>
          <DialogDescription>
            Enter your account email and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        {submit.isSuccess ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-accent mx-auto" />
            <p className="text-sm text-foreground">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
              Check your inbox (and spam folder).
            </p>
            <Button className="mt-1" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (email) submit.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="forgotEmail">Email</Label>
              <Input
                id="forgotEmail"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={!email || submit.isPending} className="gap-1.5">
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Send reset link
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
