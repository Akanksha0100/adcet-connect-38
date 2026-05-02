import { motion } from "framer-motion";
import { Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AccountStatusPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isPending = user.status === "PENDING";
  const isRejected = user.status === "REJECTED";
  const isApproved = user.status === "APPROVED";

  const Icon = isApproved ? CheckCircle2 : isPending ? Clock : ShieldAlert;
  const tone = isApproved
    ? "text-accent bg-accent/10"
    : isPending
      ? "text-amber-600 bg-amber-500/10"
      : "text-destructive bg-destructive/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto card-elevated p-8 mt-6 text-center space-y-4"
    >
      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${tone}`}>
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        {isPending && "Awaiting admin approval"}
        {isRejected && "Account application rejected"}
        {isApproved && "Account approved"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {isPending &&
          "Hi " +
            user.firstName +
            ", thanks for signing up! Our admin team will review your account shortly. While you wait you can view your profile, About, News, Support and Contact pages."}
        {isRejected && (
          <>
            Your application could not be approved.
            {user.rejectionReason && (
              <>
                <br />
                <span className="text-foreground font-medium">
                  Reason: {user.rejectionReason}
                </span>
              </>
            )}
            <br />
            Please reach out to the alumni office for next steps.
          </>
        )}
        {isApproved && "You now have full access to the alumni portal."}
      </p>
      <div className="flex justify-center gap-2 pt-2">
        <Button variant="outline" onClick={() => navigate("/dashboard/profile")}>
          View profile
        </Button>
        <Button variant="outline" onClick={() => navigate("/dashboard/support")}>
          Contact support
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await logout();
            navigate("/", { replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    </motion.div>
  );
};

export default AccountStatusPage;