import { useState } from "react";
import { ChevronDown, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/**
 * "Change password" card for the profile page. Collapsed by default — changing
 * a password is a rare, deliberate action, so it stays out of the way until
 * the header is clicked rather than sitting open above the profile details.
 */
const ChangePasswordCard = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [show, setShow] = useState(false);

  const reset = () => {
    setForm({ currentPassword: "", newPassword: "", confirm: "" });
    setShow(false);
  };

  const change = useMutation({
    mutationFn: () =>
      api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    onSuccess: () => {
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Could not change password", description: e?.message, variant: "destructive" }),
  });

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const mismatch = form.confirm.length > 0 && form.newPassword !== form.confirm;
  const canSubmit =
    form.currentPassword.length > 0 && form.newPassword.length >= 8 && form.newPassword === form.confirm && !change.isPending;

  return (
    <div className="card-elevated p-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          // Collapsing discards anything half-typed rather than keeping a
          // password sitting in state behind a closed panel.
          if (open) reset();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <span className="min-w-0">
          <span className="text-lg font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Update the password you use to sign in.
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:text-foreground ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {!open ? null : (
      <>
      <div className="flex items-center justify-end pt-4">
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
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" disabled={!canSubmit} className="gap-1.5">
            {change.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            Update Password
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={change.isPending}
            onClick={() => { reset(); setOpen(false); }}
          >
            Cancel
          </Button>
        </div>
      </form>
      </>
      )}
    </div>
  );
};

export default ChangePasswordCard;
