import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, Briefcase, GraduationCap, Mail, Edit, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  bio?: string | null; phone?: string | null; city?: string | null; country?: string | null;
  linkedinUrl?: string | null; githubUrl?: string | null; websiteUrl?: string | null;
  department?: string | null; degree?: "BE" | "ME" | "PHD" | "DIPLOMA" | null;
  admissionYear?: number | null; graduationYear?: number | null;
  currentCompany?: string | null; currentRole?: string | null;
  avatarKey?: string | null;
}

/** Whitelist of writable fields so we never send `id`, relations, etc back. */
const WRITABLE_FIELDS: (keyof Profile)[] = [
  "bio", "phone", "city", "country", "linkedinUrl", "githubUrl", "websiteUrl",
  "department", "degree", "admissionYear", "graduationYear",
  "currentCompany", "currentRole", "avatarKey",
];

const pickWritable = (p: Profile): Profile =>
  WRITABLE_FIELDS.reduce((acc, k) => {
    const v = (p as any)[k];
    if (v !== undefined) (acc as any)[k] = v;
    return acc;
  }, {} as Profile);

const ProfilePage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<Profile>("/profiles/me"),
  });

  useEffect(() => { if (profile.data) setForm(pickWritable(profile.data)); }, [profile.data]);

  const save = useMutation({
    mutationFn: () => api.patch("/profiles/me", pickWritable(form)),
    onSuccess: () => {
      toast({ title: "Profile updated" });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message, variant: "destructive" }),
  });

  // Local MinIO bucket is exposed at http://localhost:9000/adcet-alumni/<key>.
  // Override via VITE_STORAGE_PUBLIC_BASE_URL when deploying.
  const STORAGE_BASE =
    (import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL as string | undefined) ??
    "http://localhost:9000/adcet-alumni";
  const avatarUrl = profile.data?.avatarKey ? `${STORAGE_BASE}/${profile.data.avatarKey}` : undefined;

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

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card-elevated overflow-hidden">
        <div className="hero-gradient h-28" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-card">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-50"
                aria-label="Change photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
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
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{user ? `${user.firstName} ${user.lastName}` : "—"}</h1>
              {profile.data?.currentRole && (
                <p className="text-sm text-muted-foreground">{profile.data.currentRole}{profile.data.currentCompany ? ` · ${profile.data.currentCompany}` : ""}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                {profile.data?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.data.city}</span>}
                {profile.data?.department && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{profile.data.department}</span>}
                {user && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>}
              </div>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Edit className="h-3 w-3" /> Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(profile.data ?? {}); }}>Cancel</Button>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4 flex-wrap">
            {user?.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
            {user?.status === "APPROVED" && <Badge className="bg-accent/10 text-accent border-0">Verified</Badge>}
            {user?.status === "PENDING" && <Badge className="bg-amber-500/15 text-amber-600 border-0">Pending Approval</Badge>}
          </div>
        </div>
      </div>

      <div className="card-elevated p-6">
        {profile.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Phone", value: profile.data?.phone, icon: User },
              { label: "Location", value: [profile.data?.city, profile.data?.country].filter(Boolean).join(", "), icon: MapPin },
              { label: "Department", value: profile.data?.department, icon: GraduationCap },
              { label: "Graduation Year", value: profile.data?.graduationYear?.toString(), icon: GraduationCap },
              { label: "Current Company", value: profile.data?.currentCompany, icon: Briefcase },
              { label: "Current Role", value: profile.data?.currentRole, icon: Briefcase },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value || "—"}</p>
                </div>
              </div>
            ))}
            {profile.data?.bio && (
              <div className="md:col-span-2 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-sm text-foreground">{profile.data.bio}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Country</Label><Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Graduation Year</Label><Input type="number" value={form.graduationYear ?? ""} onChange={(e) => setForm({ ...form, graduationYear: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div className="space-y-1.5"><Label>Current Company</Label><Input value={form.currentCompany ?? ""} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Current Role</Label><Input value={form.currentRole ?? ""} onChange={(e) => setForm({ ...form, currentRole: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>LinkedIn URL</Label><Input value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Bio</Label><Textarea value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfilePage;
