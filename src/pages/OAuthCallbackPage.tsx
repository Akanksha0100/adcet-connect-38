/**
 * Lands here after the backend bounces back from Google/LinkedIn/GitHub with
 * tokens in the URL fragment: `#accessToken=...&refreshToken=...`.
 * We capture them, hydrate auth state via `setSession`, then forward to /dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { landingRouteFor } from "@/lib/landing";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = fragment.get("accessToken");
    const refreshToken = fragment.get("refreshToken");
    const oauthError = fragment.get("error");

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!accessToken || !refreshToken) {
      setError("Missing tokens in OAuth response.");
      return;
    }

    setSession({ accessToken, refreshToken, user: { id: "", email: "", firstName: "", lastName: "", status: "PENDING", roles: [] } })
      .then((me) => {
        // Wipe tokens from URL bar.
        window.history.replaceState(null, "", window.location.pathname);
        navigate(landingRouteFor(me), { replace: true });
      })
      .catch((e) => setError(e?.message ?? "Sign-in failed"));
  }, [navigate, setSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="card-elevated p-6 max-w-sm text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/", { replace: true })}>Back to login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
