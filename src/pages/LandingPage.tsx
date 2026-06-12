import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, Calendar, Trophy, MapPin, Phone, Mail, Globe, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "25+", label: "Years of Excellence" },
  { value: "90+", label: "Recruiting Companies" },
  { value: "512+", label: "Placed (2024–25)" },
  { value: "40 LPA", label: "Highest Package" },
];

const features = [
  { icon: Users, title: "Alumni Directory", desc: "Search and connect with graduates across industries, cities and batches." },
  { icon: Briefcase, title: "Jobs Board", desc: "Explore opportunities posted by ADCET alumni and top recruiters." },
  { icon: Calendar, title: "Events", desc: "Reunions, tech talks, placement drives and college cultural events." },
  { icon: Trophy, title: "Achievements", desc: "Celebrate milestones — promotions, patents, publications and more." },
];

const recruiters = [
  "TCS", "Infosys", "Accenture", "Capgemini", "Tech Mahindra",
  "Goldman Sachs", "Bosch", "Siemens", "Bharat Forge", "L&T",
  "Wipro", "KPIT", "Persistant", "Schneider Electric", "HCL Tech",
  "Mahindra & Mahindra", "ZF India", "Adani Group", "Amazon", "Tata Technologies",
];

const quotes = [
  { text: "No youth, especially from a rural background, should be deprived of opportunities for growth.", author: "Shri. Annasaheb Dange", role: "Founder, ADCET" },
  { text: "Scientists study the world as it is; engineers create the world that has never been.", author: "Theodore von Karman", role: "Aerospace Engineer" },
  { text: "Engineering or technology is all about using the power of science to make life better for people.", author: "N. R. Narayana Murthy", role: "Co-founder, Infosys" },
];

const departments = [
  "Mechanical Engineering", "Computer Science & Engineering", "Electrical Engineering",
  "Civil Engineering", "Aeronautical Engineering", "Food Technology",
  "AI & Data Science", "CSE (IoT & Cyber Security)", "Robotics & AI",
  "Electronics & Telecom", "BBA", "BCA",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center px-6 gap-3">
        <img src="/logo.jpeg" alt="ADCET" className="w-8 h-8 rounded-lg object-cover" />
        <div className="hidden sm:block">
          <span className="font-bold text-sm">ADCET Alumni Portal</span>
        </div>
        <nav className="hidden md:flex items-center gap-4 ml-6 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link to="/news" className="hover:text-foreground transition-colors">News</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          <a href="https://www.adcet.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">College Website</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
          <Button size="sm" asChild><Link to="/login">Join Network</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient py-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
          <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-6 shadow-xl ring-4 ring-white/20">
            <img src="/logo.jpeg" alt="ADCET" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground mb-3 leading-tight">ADCET Alumni Portal</h1>
          <p className="text-primary-foreground/80 text-lg mb-1 font-medium">Annasaheb Dange College of Engineering and Technology</p>
          <p className="text-primary-foreground/60 text-sm mb-2">Ashta, Dist. Sangli, Maharashtra — Established 1999</p>
          <p className="text-primary-foreground/70 italic text-sm mb-6">ज्ञान ज्योती नमोस्तु ते — Salutations to the Light of Knowledge</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-primary-foreground/70 mb-10">
            {["NAAC A++", "NBA Accredited", "ISO 9001:2015", "AICTE Approved", "Autonomous · Shivaji University"].map(b => (
              <span key={b} className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{b}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2 shadow-lg" asChild>
              <Link to="/login">Join the Alumni Network <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10" asChild>
              <Link to="/about">Explore ADCET</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Founder Quote */}
      <section className="py-14 px-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <Quote className="h-8 w-8 text-primary/30 mx-auto mb-4" />
          <p className="text-lg text-foreground italic leading-relaxed mb-4">
            "Dream boldly, work sincerely, and carry forward the legacy of service and excellence."
          </p>
          <p className="text-sm font-medium text-foreground">Shri. Annasaheb Dange</p>
          <p className="text-xs text-muted-foreground">Founder, ADCET — Sant Dnyaneshwar Shikshan Sanstha</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Everything for Our Alumni Community</h2>
          <p className="text-center text-muted-foreground text-sm mb-10">One platform to reconnect, grow, and give back</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="border border-border rounded-xl p-6 space-y-2 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quotes carousel */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Words That Inspire</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quotes.map((q) => (
              <motion.div key={q.author} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-xl p-6 space-y-3">
                <Quote className="h-5 w-5 text-primary/40" />
                <p className="text-sm text-foreground leading-relaxed italic">"{q.text}"</p>
                <div>
                  <p className="text-xs font-semibold text-foreground">{q.author}</p>
                  <p className="text-xs text-muted-foreground">{q.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recruiters */}
      <section className="py-16 px-6 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">Our Recruiters</h2>
          <p className="text-muted-foreground text-sm mb-8">90+ companies visited campus — from global MNCs to core engineering leaders</p>
          <div className="flex flex-wrap justify-center gap-2">
            {recruiters.map((r) => (
              <span key={r} className="bg-muted text-muted-foreground text-sm px-4 py-1.5 rounded-full border border-border">{r}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">12 Disciplines, One Campus</h2>
          <p className="text-muted-foreground text-sm mb-8">Engineering, technology, management and science — all under one roof</p>
          <div className="flex flex-wrap justify-center gap-2">
            {departments.map((d) => (
              <span key={d} className="bg-card text-muted-foreground text-sm px-4 py-1.5 rounded-full border border-border">{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 hero-gradient text-center">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="max-w-xl mx-auto">
          <img src="/logo.jpeg" alt="ADCET" className="w-16 h-16 rounded-xl object-cover mx-auto mb-5 shadow-lg" />
          <h2 className="text-2xl font-bold text-primary-foreground mb-2">Are You an ADCET Alumnus?</h2>
          <p className="text-primary-foreground/70 text-sm mb-6">
            Join thousands of ADCET graduates. Reconnect with batchmates, find career opportunities, attend events, and give back to the institution that shaped your career.
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" asChild>
            <Link to="/login">Get Started — It's Free</Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.jpeg" alt="ADCET" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-sm">ADCET, Ashta</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sant Dnyaneshwar Shikshan Sanstha's<br />
              Annasaheb Dange College of Engineering<br />
              and Technology, Ashta<br />
              <span className="text-xs italic mt-1 block">NAAC A++ · NBA · ISO 9001:2015</span>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About ADCET</Link></li>
              <li><Link to="/news" className="hover:text-foreground transition-colors">News & Announcements</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Alumni Login</Link></li>
              <li><a href="https://www.adcet.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">College Website ↗</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Contact</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5"><MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />Ashta, Dist. Sangli, Maharashtra 416 301</li>
              <li className="flex items-center gap-1.5"><Phone className="h-3 w-3 flex-shrink-0" />+91-8600600700</li>
              <li className="flex items-center gap-1.5"><Mail className="h-3 w-3 flex-shrink-0" />director@adcet.in</li>
              <li className="flex items-center gap-1.5"><Globe className="h-3 w-3 flex-shrink-0" />
                <a href="https://www.adcet.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">www.adcet.ac.in</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Annasaheb Dange College of Engineering and Technology (ADCET), Ashta. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
