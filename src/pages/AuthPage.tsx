import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap, Github, Linkedin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const departments = ["Computer Engineering", "Information Technology", "Electronics & Telecom", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering"];
const degrees: Array<{ value: "BE" | "ME" | "PHD" | "DIPLOMA"; label: string }> = [
  { value: "BE", label: "B.E." },
  { value: "ME", label: "M.E." },
  { value: "PHD", label: "Ph.D." },
  { value: "DIPLOMA", label: "Diploma" },
];
const years = Array.from({ length: 30 }, (_, i) => (2000 + i).toString());

const AuthPage = () => {
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "login">("login");
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
  });
  const [registering, setRegistering] = useState(false);

  // If already authenticated, jump to the right area.
  useEffect(() => {
    if (loading || !user) return;
    navigate(user.roles.includes("ADMIN") ? "/admin" : "/dashboard", { replace: true });
  }, [loading, user, navigate]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) return;
    setRegistering(true);
    try {
      const me = await register({
        email: reg.email.trim(),
        password: reg.password,
        firstName: reg.firstName.trim(),
        lastName: reg.lastName.trim(),
        department: reg.department || undefined,
        degree: reg.degree || undefined,
        admissionYear: reg.admissionYear ? Number(reg.admissionYear) : undefined,
        graduationYear: reg.graduationYear ? Number(reg.graduationYear) : undefined,
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
    // Backend handles the redirect dance and bounces back to /auth/callback.
    window.location.href = apiUrl(`/auth/oauth/${provider}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Register */}
      <div className={`flex-1 flex items-center justify-center p-6 lg:p-12 bg-card ${activeTab === "register" ? "flex" : "hidden lg:flex"}`}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground mt-1">Join the ADCET Alumni Network</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" required value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" required value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regEmail">Email</Label>
              <Input id="regEmail" type="email" placeholder="john@example.com" required value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admissionYear">Admission Year</Label>
                <Select value={reg.admissionYear} onValueChange={(v) => setReg({ ...reg, admissionYear: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gradYear">Graduation Year</Label>
                <Select value={reg.graduationYear} onValueChange={(v) => setReg({ ...reg, graduationYear: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Degree</Label>
                <Select value={reg.degree} onValueChange={(v) => setReg({ ...reg, degree: v as typeof reg.degree })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {degrees.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={reg.department} onValueChange={(v) => setReg({ ...reg, department: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regPassword">Password</Label>
              <div className="relative">
                <Input id="regPassword" type={showRegPassword ? "text" : "password"} placeholder="Create a password (min 8 chars)" required minLength={8} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} />
                <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={registering}>
              {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("google")}>Google</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("linkedin")}><Linkedin className="h-3 w-3 mr-1" /> LinkedIn</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => startOAuth("github")}><Github className="h-3 w-3 mr-1" /> GitHub</Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            Already have an account?{" "}
            <button onClick={() => setActiveTab("login")} className="text-accent font-medium hover:underline">Sign in</button>
          </p>
        </motion.div>
      </div>

      {/* Center Divider */}
      <div className="hidden lg:flex items-center justify-center hero-gradient px-8 py-16" style={{ minWidth: "280px" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-2">ADCET Alumni Portal</h1>
          <p className="text-primary-foreground/70 text-sm">Reconnect. Grow. Contribute.</p>
        </motion.div>
      </div>

      {/* Right - Login */}
      <div className={`flex-1 flex items-center justify-center p-6 lg:p-12 bg-background ${activeTab === "login" ? "flex" : "hidden lg:flex"}`}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ADCET Alumni Portal</h1>
            <p className="text-muted-foreground text-sm">Reconnect. Grow. Contribute.</p>
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
                <button type="button" className="text-xs text-accent hover:underline">Forgot password?</button>
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
            <Button variant="outline" className="w-full" onClick={() => startOAuth("google")}>
              Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => startOAuth("linkedin")}>
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </Button>
            <Button variant="outline" className="w-full" onClick={() => startOAuth("github")}>
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            Don't have an account?{" "}
            <button onClick={() => setActiveTab("register")} className="text-accent font-medium hover:underline">Register</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
