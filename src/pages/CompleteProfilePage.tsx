/**
 * Onboarding for accounts that reached the portal without a full profile —
 * chiefly SSO sign-ins, since Google/LinkedIn/GitHub hand back only a name and
 * an email. Collects exactly what form sign-up demands, so no route into the
 * platform can skip the mandatory fields.
 *
 * Reached via the redirect in `ProtectedRoute`; there is no way to dismiss it
 * other than completing the form or signing out.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Linkedin, Github, Twitter, Globe, Phone, MapPin,
  Briefcase, User as UserIcon, Cake, LogOut, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/departments";
import {
  DEGREES, MIN_ACADEMIC_YEAR, MONTHS, admissionYearFor, daysInMonth, type DegreeValue,
} from "@/lib/degrees";
import { landingRouteFor } from "@/lib/landing";
import { toast } from "@/hooks/use-toast";

const currentYear = new Date().getFullYear();
const LAST_GRAD_YEAR = currentYear + 6;
const years = Array.from(
  { length: LAST_GRAD_YEAR - MIN_ACADEMIC_YEAR + 1 },
  (_, i) => String(LAST_GRAD_YEAR - i),
);

/** The profile fields the API already holds, used to prefill the form. */
interface ExistingProfile {
  department?: string | null;
  degree?: DegreeValue | null;
  graduationYear?: number | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  phone?: string | null;
  city?: string | null;
  currentCompany?: string | null;
  currentRole?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
  bio?: string | null;
}

const str = (v: unknown): string => (v == null ? "" : String(v));

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, refreshMe } = useAuth();
  const [form, setForm] = useState({
    department: "", degree: "" as "" | DegreeValue, graduationYear: "",
    birthDay: "", birthMonth: "", phone: "", city: "",
    currentCompany: "", currentRole: "", linkedinUrl: "",
    githubUrl: "", twitterUrl: "", websiteUrl: "", bio: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Prefill from whatever the account already has, so an existing member with
  // one blank field isn't made to retype the other eight.
  useEffect(() => {
    let cancelled = false;
    api.get<ExistingProfile>("/profiles/me")
      .then((p) => {
        if (cancelled || !p) return;
        setForm((f) => ({
          ...f,
          department: str(p.department), degree: (p.degree ?? "") as "" | DegreeValue,
          graduationYear: str(p.graduationYear), birthDay: str(p.birthDay),
          birthMonth: str(p.birthMonth), phone: str(p.phone), city: str(p.city),
          currentCompany: str(p.currentCompany), currentRole: str(p.currentRole),
          linkedinUrl: str(p.linkedinUrl), githubUrl: str(p.githubUrl),
          twitterUrl: str(p.twitterUrl), websiteUrl: str(p.websiteUrl), bio: str(p.bio),
        }));
      })
      // A missing profile just means an empty form — not an error worth showing.
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const validate = (): boolean => {
    const e: string[] = [];
    if (!form.degree) e.push("Degree is required");
    if (!form.department) e.push("Department is required");
    if (!form.graduationYear) e.push("Graduation year is required");
    if (!form.birthMonth || !form.birthDay) e.push("Birth date and month are required");
    if (!form.phone.trim()) e.push("Phone number is required");
    if (!form.city.trim()) e.push("City is required");
    if (!form.currentCompany.trim()) e.push("Current company is required");
    if (!form.currentRole.trim()) e.push("Current role is required");
    if (!form.linkedinUrl.trim()) e.push("LinkedIn profile URL is required");
    setErrors(e);
    return e.length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      await api.post<AuthUser>("/auth/complete-profile", {
        department: form.department,
        degree: form.degree,
        graduationYear: Number(form.graduationYear),
        birthDay: Number(form.birthDay),
        birthMonth: Number(form.birthMonth),
        phone: form.phone.trim(),
        city: form.city.trim(),
        currentCompany: form.currentCompany.trim(),
        currentRole: form.currentRole.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        githubUrl: form.githubUrl.trim() || undefined,
        twitterUrl: form.twitterUrl.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      // Re-read from the server rather than trusting the POST's echo, so the
      // gate in ProtectedRoute and this navigation agree on the same state.
      const me = await refreshMe();
      toast({
        title: "Profile completed",
        description: me?.status === "APPROVED"
          ? "You're all set."
          : "Your account is now with the admin team for approval.",
      });
      navigate(me ? landingRouteFor(me) : "/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Couldn't save your profile",
        description: err?.message ?? "Please check the form and try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4">
            <img src="/logo.jpeg" alt="ADCET Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            One more step{user ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Signing in with Google, LinkedIn or GitHub tells us who you are, but not where you
            studied or what you do now. Every ADCET member provides these details — please fill
            them in to finish setting up your account.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground flex items-start gap-2 mb-6">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>Your account will be reviewed by an administrator once this is complete.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Degree *</Label>
              <Select value={form.degree} onValueChange={(v) => setForm({ ...form, degree: v as DegreeValue })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DEGREES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Graduation Year *</Label>
              <Select value={form.graduationYear} onValueChange={(v) => setForm({ ...form, graduationYear: v })}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {form.degree && form.graduationYear && (
            <p className="text-xs text-muted-foreground -mt-1">
              Admission year taken as{" "}
              <span className="font-medium text-foreground">
                {admissionYearFor(form.degree as DegreeValue, Number(form.graduationYear))}
              </span>{" "}
              ({DEGREES.find((d) => d.value === form.degree)?.durationYears}-year course).
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Department *</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue placeholder="Select your department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Cake className="h-3.5 w-3.5 text-pink-500" /> Birth Month *
              </Label>
              <Select
                value={form.birthMonth}
                onValueChange={(v) => setForm({
                  ...form,
                  birthMonth: v,
                  birthDay:
                    form.birthDay && Number(form.birthDay) > daysInMonth(Number(v))
                      ? ""
                      : form.birthDay,
                })}
              >
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Birth Date *</Label>
              <Select
                value={form.birthDay}
                onValueChange={(v) => setForm({ ...form, birthDay: v })}
                disabled={!form.birthMonth}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.birthMonth ? "Date" : "Pick month"} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: daysInMonth(Number(form.birthMonth) || 1) }, (_, i) => i + 1)
                    .map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            We only ask for the day and month, so we can wish you on your birthday.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone *</Label>
              <Input required type="tel" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> City *</Label>
              <Input required placeholder="e.g. Pune" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Current Company *</Label>
              <Input required placeholder="e.g. TCS" value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> Current Role *</Label>
              <Input required placeholder="e.g. Software Engineer" value={form.currentRole} onChange={(e) => setForm({ ...form, currentRole: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn Profile URL *
            </Label>
            <Input required type="url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
            <p className="text-xs text-muted-foreground">Required for verification and networking</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub</Label>
              <Input type="url" placeholder="https://github.com/..." value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X</Label>
              <Input type="url" placeholder="https://x.com/..." value={form.twitterUrl} onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Website / Portfolio</Label>
            <Input type="url" placeholder="https://yoursite.com" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Bio (brief introduction)</Label>
            <Textarea placeholder="Tell us a bit about yourself..." rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>

          {errors.length > 0 && (
            <div className="text-sm text-destructive space-y-1">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" className="gap-1.5" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Continue"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfilePage;
