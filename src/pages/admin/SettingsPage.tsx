import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Moon, Shield, Mail, Edit, Loader2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { requestPushPermission, usePreferences, type PreferenceKey } from "@/lib/preferences";

interface AdminProfile {
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  currentRole?: string | null;
  currentCompany?: string | null;
  avatarKey?: string | null;
}

const WRITABLE: (keyof AdminProfile)[] = [
  "bio", "phone", "city", "country", "currentRole", "currentCompany", "avatarKey",
];

const pick = (p: AdminProfile): AdminProfile =>
  WRITABLE.reduce((acc, k) => {
    const v = (p as any)[k];
    if (v !== undefined) (acc as any)[k] = v;
    return acc;
  }, {} as AdminProfile);

const STORAGE_BASE =
  (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
  "http://localhost:9000/adcet-alumni";

const SettingsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AdminProfile>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPref] = usePreferences();

  const profile = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<AdminProfile>("/profiles/me"),
  });

  useEffect(() => {
    if (profile.data) setForm(pick(profile.data));
  }, [profile.data]);

  // Achievement notification recipients (director, principal, marketing, ...).
  const [recipients, setRecipients] = useState("");
  const recipientsSection = useQuery({
    queryKey: ["content", "section", "achievement_recipients"],
    queryFn: () =>
      api.get<{ key: string; title: string; body: string } | null>(
        "/content/sections/achievement_recipients",
      ),
  });
  useEffect(() => {
    if (recipientsSection.data) setRecipients(recipientsSection.data.body ?? "");
  }, [recipientsSection.data]);

  const saveRecipients = useMutation({
    mutationFn: () =>
      api.put("/content/sections/achievement_recipients", {
        title: "Achievement Notification Recipients",
        body: recipients.trim() || " ",
      }),
    onSuccess: () => {
      toast({ title: "Recipients saved" });
      qc.invalidateQueries({ queryKey: ["content", "section", "achievement_recipients"] });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: () => api.patch("/profiles/me", pick(form)),
    onSuccess: () => {
      toast({ title: "Profile updated" });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: e?.message, variant: "destructive" }),
  });

  const handleAvatarPick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const presign = await api.post<{ uploadUrl: string; key: string }>("/uploads/presign", {
        fileName: file.name,
        contentType: file.type,
        scope: "avatar",
      });
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api.patch("/profiles/me", { avatarKey: presign.key });
      toast({ title: "Photo updated" });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "AD";
  const avatarUrl = profile.data?.avatarKey ? `${STORAGE_BASE}/${profile.data.avatarKey}` : undefined;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your admin profile and preferences.</p>
      </div>

      <div className="card-elevated p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </h2>
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setForm(pick(profile.data ?? {}));
                }}
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Admin photo" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-50"
              aria-label="Change photo"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarPick(f);
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {profile.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">First Name</p>
              <p className="text-sm text-foreground">{user?.firstName ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Name</p>
              <p className="text-sm text-foreground">{user?.lastName ?? "—"}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{user?.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm text-foreground">{profile.data?.phone || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm text-foreground">{profile.data?.currentRole || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">City</p>
              <p className="text-sm text-foreground">{profile.data?.city || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Country</p>
              <p className="text-sm text-foreground">{profile.data?.country || "—"}</p>
            </div>
            {profile.data?.bio && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Bio</p>
                <p className="text-sm text-foreground">{profile.data.bio}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={user?.firstName ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={user?.lastName ?? ""} disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} type="email" disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Title</Label>
              <Input
                value={form.currentRole ?? ""}
                onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.country ?? ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Bio</Label>
              <Textarea
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Name and email are managed by the alumni office. Contact support to change them.
        </p>
      </div>

      <div className="card-elevated p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" /> Preferences
        </h2>
        <div className="space-y-4">
          {([
            { key: "emailNotifications", icon: Bell, label: "Email Notifications", desc: "Receive email alerts for new requests" },
            { key: "pushNotifications", icon: Bell, label: "Push Notifications", desc: "Get browser push notifications" },
            { key: "darkMode", icon: Moon, label: "Dark Mode", desc: "Toggle dark theme appearance" },
            { key: "weeklyDigest", icon: Mail, label: "Weekly Digest", desc: "Receive a weekly summary report" },
          ] as { key: PreferenceKey; icon: any; label: string; desc: string }[]).map((pref) => (
            <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <pref.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs[pref.key]}
                onCheckedChange={async (checked) => {
                  if (pref.key === "pushNotifications" && checked) {
                    const granted = await requestPushPermission();
                    if (!granted) {
                      toast({
                        title: "Push permission denied",
                        description: "Enable notifications in your browser to receive alerts.",
                        variant: "destructive",
                      });
                      return;
                    }
                  }
                  setPref(pref.key, checked);
                  toast({ title: `${pref.label} ${checked ? "enabled" : "disabled"}` });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card-elevated p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Achievement Notification Recipients
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            When an achievement is approved, an announcement email is sent to these
            addresses (e.g. director, principal, editing & marketing team) in addition
            to the alumnus who submitted it. Enter one email per line (commas also work).
          </p>
        </div>
        {recipientsSection.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Textarea
              rows={5}
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder={"director@adcet.in\nprincipal@adcet.in\nmarketing@adcet.in"}
            />
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => saveRecipients.mutate()}
              disabled={saveRecipients.isPending}
            >
              {saveRecipients.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save recipients"}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default SettingsPage;
