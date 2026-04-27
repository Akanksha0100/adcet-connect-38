import { motion } from "framer-motion";
import { User, Bell, Moon, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "AD";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your admin profile and preferences.</p>
      </div>

      <div className="card-elevated p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4" /> Profile
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" disabled>Change Photo</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">First Name</label>
            <Input value={user?.firstName ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Last Name</label>
            <Input value={user?.lastName ?? ""} disabled />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={user?.email ?? ""} type="email" disabled />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Profile name and email are managed by the alumni office. Contact support to change them.
        </p>
      </div>

      <div className="card-elevated p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" /> Preferences
        </h2>
        <div className="space-y-4">
          {[
            { icon: Bell, label: "Email Notifications", desc: "Receive email alerts for new requests" },
            { icon: Bell, label: "Push Notifications", desc: "Get browser push notifications" },
            { icon: Moon, label: "Dark Mode", desc: "Toggle dark theme appearance" },
            { icon: Mail, label: "Weekly Digest", desc: "Receive a weekly summary report" },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <pref.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
              </div>
              <Switch defaultChecked={pref.label !== "Dark Mode"} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
