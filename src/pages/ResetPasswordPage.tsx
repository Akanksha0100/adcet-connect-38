import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const reset = useMutation({
    mutationFn: () => api.post("/auth/reset-password", { token, newPassword: password }, { anonymous: true }),
  });

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !!token && !reset.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.jpeg" alt="ADCET" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-bold">ADCET Alumni Portal</span>
          </Link>
        </div>

        <div className="card-elevated p-6">
          {!token ? (
            <div className="text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h1 className="text-lg font-bold text-foreground">Invalid reset link</h1>
              <p className="text-sm text-muted-foreground">This link is missing its token. Please request a new password reset.</p>
              <Button asChild className="mt-2"><Link to="/login">Back to sign in</Link></Button>
            </div>
          ) : reset.isSuccess ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-accent mx-auto" />
              <h1 className="text-lg font-bold text-foreground">Password reset</h1>
              <p className="text-sm text-muted-foreground">Your password has been updated. You can now sign in with your new password.</p>
              <Button className="mt-2" onClick={() => navigate("/login")}>Go to sign in</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">Set a new password</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Choose a strong password you don't use elsewhere.</p>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (canSubmit) reset.mutate(); }}>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {tooShort && <p className="text-xs text-destructive">At least 8 characters.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  {mismatch && <p className="text-xs text-destructive">Passwords don't match.</p>}
                </div>

                {reset.isError && (
                  <p className="text-sm text-destructive">{(reset.error as Error)?.message ?? "Could not reset password."}</p>
                )}

                <Button type="submit" className="w-full gap-1.5" disabled={!canSubmit}>
                  {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
