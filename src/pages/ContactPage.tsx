import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Globe, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const contacts = [
  { icon: MapPin, label: "Address", value: "Ashta, Taluka Walwa, Dist. Sangli, Maharashtra 416 301", link: "https://maps.google.com/?q=Annasaheb+Dange+College+Ashta" },
  { icon: Phone, label: "Phone", value: "+91-8600600700", link: "tel:+918600600700" },
  { icon: Mail, label: "General Enquiry", value: "director@adcet.in", link: "mailto:director@adcet.in" },
  { icon: Mail, label: "Alumni Office", value: "alumni@adcet.in", link: "mailto:alumni@adcet.in" },
  { icon: Globe, label: "Website", value: "www.adcet.ac.in", link: "https://www.adcet.ac.in" },
  { icon: Clock, label: "Office Hours", value: "Mon–Sat, 9:00 AM – 5:00 PM IST", link: null },
];

export default function ContactPage() {
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
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">Contact Us</h1>
          <p className="text-primary-foreground/70 text-sm">Reach out to the ADCET Alumni Office or the college administration</p>
        </motion.div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-5">Get in Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((c) => (
              <div key={c.label + c.value} className="border border-border rounded-xl p-5 space-y-1.5 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  <c.icon className="h-3.5 w-3.5" />{c.label}
                </div>
                {c.link ? (
                  <a href={c.link} target={c.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    className="text-sm text-foreground hover:text-primary transition-colors">{c.value}</a>
                ) : (
                  <p className="text-sm text-foreground">{c.value}</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">For Alumni Portal Support</h2>
          <div className="bg-muted/40 border border-border rounded-xl p-6 text-sm text-muted-foreground space-y-3">
            <p>Having trouble with your account or portal access? Here's how to get help quickly:</p>
            <ul className="list-disc ml-5 space-y-1.5">
              <li>Email <a href="mailto:alumni@adcet.in" className="text-foreground hover:underline">alumni@adcet.in</a> with subject "Portal Support"</li>
              <li>Call <a href="tel:+918600600700" className="text-foreground hover:underline">+91-8600600700</a> during office hours</li>
              <li>Once logged in, use the live chat on your dashboard for fastest response</li>
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-3">Already Registered?</h2>
          <p className="text-muted-foreground text-sm mb-4">Sign in to access the full alumni portal — events, jobs board, alumni directory, and more.</p>
          <Button asChild><Link to="/login">Sign In to Your Account</Link></Button>
        </motion.section>
      </div>

      <footer className="border-t border-border bg-card py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Annasaheb Dange College of Engineering and Technology (ADCET), Ashta. All Rights Reserved.
      </footer>
    </div>
  );
}
