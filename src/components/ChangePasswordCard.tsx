import { useState } from "react";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/** Self-contained "change password" card for the profile / settings pages. */
const ChangePasswordCard = () => {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [show, setShow] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    onSuccess: () => {
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    },
    onError: (e: any) => toast({ title: "Could not change password", description: e?.message, variant: "destructive" }),
  });

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const mismatch = form.confirm.length > 0 && form.newPassword !== form.confirm;
  const canSubmit =
    form.currentPassword.length > 0 && form.newPassword.length >= 8 && form.newPassword === form.confirm && !change.isPending;

  return (
    <div className="card-elevated p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Change Password
        </h2>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) change.mutate(); }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Current Password</Label>
          <Input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <Input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          {tooShort && <p className="text-xs text-destructive">At least 8 characters.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Confirm New Password</Label>
          <Input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
          {mismatch && <p className="text-xs text-destructive">Passwords don't match.</p>}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!canSubmit} className="gap-1.5">
            {change.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordCard;
