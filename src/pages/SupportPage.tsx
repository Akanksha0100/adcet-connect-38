import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "My account is pending approval. How long does it take?",
    a: "The admin team typically reviews new accounts within 1–2 working days. You'll receive an email notification once your account is approved. While waiting, you can view your profile, About, News, and Contact pages.",
  },
  {
    q: "How do I verify I'm an ADCET alumnus?",
    a: "When you register, the admin team cross-checks your details (graduation year, department, email) with college records. Make sure you register with your correct academic details. If there's a mismatch, email alumni@adcet.in with your certificate or marksheet.",
  },
  {
    q: "I forgot my password. How do I reset it?",
    a: "On the login page, click 'Forgot password?' and enter your registered email. You'll receive a reset link. If you don't receive it within 5 minutes, check your spam folder or contact alumni@adcet.in.",
  },
  {
    q: "Can I update my profile after registration?",
    a: "Yes. Once approved, you can update your profile at any time — current company, job title, city, LinkedIn, and more. Keeping your profile updated helps alumni and recruiters find you.",
  },
  {
    q: "How do I register for an event?",
    a: "Go to Events on the dashboard and click 'Register' on any upcoming event. You'll receive a confirmation on screen. Your RSVP will be visible to the event organiser.",
  },
  {
    q: "My account was rejected. What should I do?",
    a: "You'll see the rejection reason on your account status page. Usually this means a mismatch in your academic details. Email alumni@adcet.in with your graduation certificate or hall ticket to get re-reviewed.",
  },
  {
    q: "I'm a recruiter or company. How do I post jobs for ADCET alumni?",
    a: "Contact the Placement Cell at director@adcet.in or call +91-8600600700. Once verified, you'll get a recruiter account to post job listings on the portal.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center px-6 gap-3">
        <img src="/logo.jpeg" alt="ADCET" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-sm hidden sm:inline">ADCET Alumni Portal</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Home</Link></Button>
          <Button size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </header>

      <section className="hero-gradient py-14 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">Support</h1>
          <p className="text-primary-foreground/70 text-sm">Answers to common questions and how to reach us</p>
        </motion.div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="border border-border rounded-xl group open:border-primary/40 transition-colors">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-sm text-foreground list-none select-none">
                  {f.q}
                  <span className="ml-3 text-muted-foreground group-open:rotate-180 transition-transform text-lg leading-none">›</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Still Need Help?</h2>
          <div className="bg-muted/40 border border-border rounded-xl p-6 text-sm text-muted-foreground space-y-2">
            <p>Our alumni office is happy to help with any issue not covered above.</p>
            <ul className="list-disc ml-5 space-y-1.5 mt-3">
              <li>Email <a href="mailto:alumni@adcet.in" className="text-foreground hover:underline">alumni@adcet.in</a> — we respond within one working day</li>
              <li>Call <a href="tel:+918600600700" className="text-foreground hover:underline">+91-8600600700</a> — Mon to Sat, 9 AM–5 PM IST</li>
              <li>If already logged in, use the live chat widget on your dashboard</li>
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-3">Ready to Join?</h2>
          <p className="text-muted-foreground text-sm mb-4">Register and connect with the ADCET alumni network today.</p>
          <div className="flex gap-3">
            <Button asChild><Link to="/login">Sign In / Register</Link></Button>
            <Button variant="outline" asChild><Link to="/contact">Contact Us</Link></Button>
          </div>
        </motion.section>
      </div>

      <footer className="border-t border-border bg-card py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Annasaheb Dange College of Engineering and Technology (ADCET), Ashta. All Rights Reserved.
      </footer>
    </div>
  );
}
