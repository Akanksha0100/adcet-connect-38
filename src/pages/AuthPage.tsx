import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Github, Linkedin, Loader2, ArrowLeft, ArrowRight, Twitter, Globe, Phone, MapPin, Briefcase, User as UserIcon, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, apiUrl } from "@/lib/api";
import { DEPARTMENTS as departments } from "@/lib/departments";
import { toast } from "@/hooks/use-toast";
import ForgotPasswordDialog from "@/components/ForgotPasswordDialog";

const degrees: Array<{ value: "BE" | "ME" | "PHD" | "DIPLOMA"; label: string }> = [
  { value: "BE", label: "B.E." },
  { value: "ME", label: "M.E." },
  { value: "PHD", label: "Ph.D." },
  { value: "DIPLOMA", label: "Diploma" },
];
// Years run from the current year backwards — an alumnus can never have a
// graduation (or admission) year in the future.
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => String(currentYear - i));

const AuthPage = () => {
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "login">("login");
  const [regStep, setRegStep] = useState(1);
  const [forgotOpen, setForgotOpen] = useState(false);
  const navigate = useNavigate();
  const { login, register, user, loading } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Register form state
  const [reg, setReg] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "",
    degree: "" as "" | "BE" | "ME" | "PHD" | "DIPLOMA",
    admissionYear: "",
    graduationYear: "",
    // Step 2
    linkedinUrl: "",
    githubUrl: "",
    twitterUrl: "",
    websiteUrl: "",
    phone: "",
    city: "",
    bio: "",
    currentCompany: "",
    currentRole: "",
  });
  const [registering, setRegistering] = useState(false);
  const [step1Errors, setStep1Errors] = useState<string[]>([]);

  // Step 3: email OTP verification
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (loading || !user) return;
    navigate(user.roles.includes("ADMIN") ? "/admin" : "/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const validateStep1 = (): boolean => {
    const errors: string[] = [];
    if (!reg.firstName.trim()) errors.push("First name is required");
    if (!reg.lastName.trim()) errors.push("Last name is required");
    if (!reg.email.trim()) errors.push("Email is required");
    if (reg.password.length < 8) errors.push("Password must be at least 8 characters");
    if (reg.graduationYear && Number(reg.graduationYear) > currentYear)
      errors.push("Graduation year cannot be in the future");
    if (reg.admissionYear && reg.graduationYear && Number(reg.graduationYear) < Number(reg.admissionYear))
      errors.push("Graduation year cannot be before admission year");
    setStep1Errors(errors);
    return errors.length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setRegStep(2);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const me = await login(loginEmail.trim(), loginPassword);
      toast({ title: "Welcome back", description: `Signed in as ${me.firstName} ${me.lastName}` });
      navigate(me.roles.includes("ADMIN") ? "/admin" : "/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err?.message ?? "Check your credentials", variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  /** Send (or resend) the email verification code and move to step 3. */
  const sendOtp = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    try {
      await api.post("/auth/register/send-otp", { email: reg.email.trim() }, { anonymous: true });
      toast({ title: "Verification code sent", description: `Check ${reg.email.trim()} for a 6-digit code.` });
      setResendCooldown(30);
      setRegStep(3);
    } catch (err: any) {
      toast({ title: "Could not send code", description: err?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.linkedinUrl.trim()) {
      toast({ title: "LinkedIn required", description: "Please provide your LinkedIn profile URL", variant: "destructive" });
      return;
    }
    await sendOtp();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) return;
    if (otp.trim().length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code sent to your email", variant: "destructive" });
      return;
    }
    setRegistering(true);
    try {
      const me = await register({
        otp: otp.trim(),
        email: reg.email.trim(),
        password: reg.password,
        firstName: reg.firstName.trim(),
        lastName: reg.lastName.trim(),
        department: reg.department || undefined,
        degree: reg.degree || undefined,
        admissionYear: reg.admissionYear ? Number(reg.admissionYear) : undefined,
        graduationYear: reg.graduationYear ? Number(reg.graduationYear) : undefined,
        linkedinUrl: reg.linkedinUrl.trim(),
        githubUrl: reg.githubUrl.trim() || undefined,
        twitterUrl: reg.twitterUrl.trim() || undefined,
        websiteUrl: reg.websiteUrl.trim() || undefined,
        phone: reg.phone.trim() || undefined,
        city: reg.city.trim() || undefined,
        bio: reg.bio.trim() || undefined,
        currentCompany: reg.currentCompany.trim() || undefined,
        currentRole: reg.currentRole.trim() || undefined,
      });
      toast({
        title: "Account created",
        description: me.status === "PENDING"
          ? "Your account is pending admin approval. Some features may be limited."
          : "You're all set!",
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const startOAuth = (provider: "google" | "linkedin" | "github") => {
    window.location.href = apiUrl(`/auth/oauth/${provider}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Register */}
      <div className={`flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-card ${activeTab === "register" ? "flex" : "hidden lg:flex"}`}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Step {regStep} of 3
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {regStep === 1
                ? "Join the ADCET Alumni Network"
                : regStep === 2
                  ? "Complete your professional profile"
                  : "Verify your email address"}
            </p>
            {/* Step indicators */}
            <div className="flex gap-2 mt-3">
              <div className={`h-1 flex-1 rounded-full transition-colors ${regStep >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${regStep >= 2 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${regStep >= 3 ? "bg-primary" : "bg-muted"}`} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {regStep === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" placeholder="John" required value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" placeholder="Doe" required value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="regEmail">Email *</Label>
                    <Input id="regEmail" type="email" placeholder="john@example.com" required value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Admission Year</Label>
                      <Select value={reg.admissionYear} onValueChange={(v) => setReg({ ...reg, admissionYear: v })}>
                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Graduation Year</Label>
                      <Select value={reg.graduationYear} onValueChange={(v) => setReg({ ...reg, graduationYear: v })}>
                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Degree</Label>
                      <Select value={reg.degree} onValueChange={(v) => setReg({ ...reg, degree: v as typeof reg.degree })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{degrees.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Select value={reg.department} onValueChange={(v) => setReg({ ...reg, department: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="regPassword">Password *</Label>
                    <div className="relative">
                      <Input id="regPassword" type={showRegPassword ? "text" : "password"} placeholder="Create a password (min 8 chars)" required minLength={8} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {step1Errors.length > 0 && (
                    <div className="text-sm text-destructive space-y-1">
                      {step1Errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}

                  <Button type="button" className="w-full mt-2 gap-2" onClick={handleNextStep}>
                    Next: Professional Profile <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("google")}>Google</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("linkedin")}><Linkedin className="h-3 w-3 mr-1" /> LinkedIn</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("github")}><Github className="h-3 w-3 mr-1" /> GitHub</Button>
                  </div>
                </div>
              </motion.div>
            ) : regStep === 2 ? (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleStep2} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn Profile URL *
                    </Label>
                    <Input
                      required
                      type="url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={reg.linkedinUrl}
                      onChange={(e) => setReg({ ...reg, linkedinUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Required for verification and networking</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Github className="h-3.5 w-3.5" /> GitHub
                      </Label>
                      <Input type="url" placeholder="https://github.com/..." value={reg.githubUrl} onChange={(e) => setReg({ ...reg, githubUrl: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X
                      </Label>
                      <Input type="url" placeholder="https://x.com/..." value={reg.twitterUrl} onChange={(e) => setReg({ ...reg, twitterUrl: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> Website / Portfolio
                    </Label>
                    <Input type="url" placeholder="https://yoursite.com" value={reg.websiteUrl} onChange={(e) => setReg({ ...reg, websiteUrl: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Phone
                      </Label>
                      <Input type="tel" placeholder="+91 9876543210" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> City
                      </Label>
                      <Input placeholder="e.g. Pune" value={reg.city} onChange={(e) => setReg({ ...reg, city: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Current Company
                      </Label>
                      <Input placeholder="e.g. TCS" value={reg.currentCompany} onChange={(e) => setReg({ ...reg, currentCompany: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5" /> Current Role
                      </Label>
                      <Input placeholder="e.g. Software Engineer" value={reg.currentRole} onChange={(e) => setReg({ ...reg, currentRole: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bio (brief introduction)</Label>
                    <Textarea placeholder="Tell us a bit about yourself..." rows={2} value={reg.bio} onChange={(e) => setReg({ ...reg, bio: e.target.value })} />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" className="gap-1.5" onClick={() => setRegStep(1)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={sendingOtp}>
                      {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next: Verify Email <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground flex items-start gap-2">
                    <MailCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>
                      We sent a 6-digit verification code to{" "}
                      <span className="font-medium text-foreground">{reg.email.trim()}</span>.
                      Enter it below to finish creating your account.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="regOtp">Verification Code *</Label>
                    <Input
                      id="regOtp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="123456"
                      className="text-center text-lg tracking-[0.5em] font-semibold"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-xs text-muted-foreground">The code expires in 10 minutes.</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Didn't get the code?</span>
                    <button
                      type="button"
                      disabled={sendingOtp || resendCooldown > 0}
                      onClick={sendOtp}
                      className="text-accent font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" className="gap-1.5" onClick={() => setRegStep(2)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={registering || otp.length !== 6}>
                      {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Create Account"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            Already have an account?{" "}
            <button onClick={() => setActiveTab("login")} className="text-accent font-medium hover:underline">Sign in</button>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex items-center justify-center hero-gradient px-8 py-16" style={{ minWidth: "280px" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 overflow-hidden">
            <img src="/logo.jpeg" alt="ADCET Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-1">ADCET Alumni Portal</h1>
          <p className="text-primary-foreground/80 text-xs mb-1">Annasaheb Dange College of Engineering</p>
          <p className="text-primary-foreground/80 text-xs mb-3">and Technology, Ashta</p>
          <p className="text-primary-foreground/70 text-sm">Reconnect. Grow. Contribute.</p>
          <div className="mt-4 space-y-1 text-primary-foreground/60 text-xs">
            <p>NAAC A++ · NBA Accredited · ISO 9001:2015</p>
            <p>Affiliated to Shivaji University, Kolhapur</p>
          </div>
        </motion.div>
      </div>

      {/* Right - Login */}
      <div className={`flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-background ${activeTab === "login" ? "flex" : "hidden lg:flex"}`}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
              <img src="/logo.jpeg" alt="ADCET Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ADCET Alumni Portal</h1>
            <p className="text-muted-foreground text-xs">Annasaheb Dange College of Engineering and Technology, Ashta</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loginEmail">Email</Label>
              <Input id="loginEmail" type="email" placeholder="you@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="loginPassword">Password</Label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-accent hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Input id="loginPassword" type={showLoginPassword ? "text" : "password"} placeholder="Enter your password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loggingIn}>
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="w-full" onClick={() => startOAuth("google")}>Google</Button>
            <Button variant="outline" className="w-full" onClick={() => startOAuth("linkedin")}>
              <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
            </Button>
            <Button variant="outline" className="w-full" onClick={() => startOAuth("github")}>
              <Github className="mr-2 h-4 w-4" /> GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            Don't have an account?{" "}
            <button onClick={() => setActiveTab("register")} className="text-accent font-medium hover:underline">Register</button>
          </p>
        </motion.div>
      </div>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={loginEmail} />
    </div>
  );
};

export default AuthPage;
