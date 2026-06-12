import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Globe, ArrowLeft, Quote, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const accreditations = [
  { label: "NAAC Grade", value: "A++" },
  { label: "Established", value: "1999" },
  { label: "Campus", value: "32 Acres" },
  { label: "Affiliation", value: "Shivaji University" },
  { label: "Approval", value: "AICTE, New Delhi" },
  { label: "Quality", value: "ISO 9001:2015" },
  { label: "Programmes", value: "NBA Accredited" },
  { label: "DTE Code", value: "06283" },
];

const ugPrograms = [
  { name: "Mechanical Engineering", intake: 180 },
  { name: "Computer Science & Engineering", intake: 180 },
  { name: "Electrical Engineering", intake: 60 },
  { name: "Civil Engineering", intake: 60 },
  { name: "Aeronautical Engineering", intake: 60 },
  { name: "Food Technology", intake: 60 },
  { name: "AI & Data Science", intake: 60 },
  { name: "CSE (IoT & Cyber Security)", intake: 60 },
  { name: "Robotics & Artificial Intelligence", intake: 60 },
  { name: "Electronics & Telecom Engineering", intake: 60 },
];

const pgPrograms = [
  "M.Tech – Mechanical Engineering (Design)",
  "M.Tech – Computer Science & Engineering",
  "M.Tech – Electrical Power System",
  "M.Tech – Civil Engineering (CASE)",
];

const facilities = [
  { name: "AICTE-IDEA Lab", desc: "State-of-the-art innovation, design & entrepreneurship lab under AICTE's national initiative." },
  { name: "Aircraft on Campus", desc: "A real aircraft for hands-on aeronautical engineering training — unique among colleges in Maharashtra." },
  { name: "Central Computer Centre", desc: "High-speed computing facility beyond department-level labs, available to all branches." },
  { name: "Library", desc: "Extensive collection of technical books, journals, and digital resources with Wi-Fi enabled study zones." },
  { name: "Sports Complex", desc: "Indoor (badminton, table tennis, chess, billiards) and outdoor facilities (cricket, volleyball, kabaddi)." },
  { name: "Hostel", desc: "On-campus residential accommodation for outstation students with 24/7 security." },
];

const placementStats = [
  { year: "2024–25", placed: "512+", companies: "90+", highest: "10 LPA (CSE)" },
  { year: "2023–24", placed: "554", companies: "82", highest: "33 LPA (Mech)" },
  { year: "2022–23", placed: "522", companies: "75", highest: "12 LPA" },
];

export default function AboutPage() {
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

      {/* Hero */}
      <section className="hero-gradient py-16 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-5 shadow-lg ring-4 ring-white/20">
            <img src="/logo.jpeg" alt="ADCET" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">About ADCET</h1>
          <p className="text-primary-foreground/80 text-base">Annasaheb Dange College of Engineering and Technology, Ashta</p>
          <p className="text-primary-foreground/60 text-sm mt-1 italic">ज्ञान ज्योती नमोस्तु ते — Salutations to the Light of Knowledge</p>
        </motion.div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-14">

        {/* About */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">About the College</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>
              The Annasaheb Dange College of Engineering and Technology (ADCET), Ashta is one of the iconic public
              institutions of higher technical education in Western Maharashtra. Founded in 1999 by Hon. Shri.
              Annasaheb Dange under the aegis of Sant Dnyaneshwar Shikshan Sanstha (SDSS), Islampur, ADCET was
              established with a singular vision: to bring quality technical education to the rural heartland of
              Maharashtra and transform the aspirations of youth into reality.
            </p>
            <p>
              Spread across a lush 32-acre campus in Ashta, approximately 20 km from Sangli city, ADCET is an
              Empowered Autonomous institute affiliated to Shivaji University, Kolhapur, approved by AICTE, New
              Delhi, and the Government of Maharashtra. The institute earned its Autonomous status in 2017–18 —
              a recognition of its academic rigour and governance.
            </p>
            <p>
              ADCET is NAAC accredited with the prestigious "A++" grade — the highest possible — ISO 9001:2015
              certified, and runs programmes accredited by NBA, New Delhi. The institution is also featured in the
              NIRF rankings and runs an active AICTE-IDEA Lab for innovation and entrepreneurship.
            </p>
          </div>
        </motion.section>

        {/* Founder Quote */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-muted/40 border border-border rounded-xl p-8">
          <Quote className="h-8 w-8 text-primary/30 mb-4" />
          <p className="text-lg italic text-foreground leading-relaxed mb-4">
            "Education is not merely the transmission of knowledge; it is the cultivation of purpose, values, and capability. No youth, especially from a rural background, should be deprived of opportunities for growth."
          </p>
          <p className="text-sm font-semibold text-foreground">Hon. Shri. Annasaheb Dange</p>
          <p className="text-xs text-muted-foreground">Founder & Chairman, ADCET · Sant Dnyaneshwar Shikshan Sanstha</p>
        </motion.section>

        {/* Key stats */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Key Highlights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {accreditations.map((a) => (
              <div key={a.label} className="border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                <p className="font-semibold text-sm text-foreground">{a.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Vision Mission */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3"><Award className="h-5 w-5 text-primary" /><h3 className="font-bold text-lg">Our Vision</h3></div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To be a Leader in producing professionally competent engineers who contribute to society through innovation, ethics, and lifelong learning.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3"><Award className="h-5 w-5 text-primary" /><h3 className="font-bold text-lg">Our Mission</h3></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">M1.</span>Impart effective outcome-based education.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">M2.</span>Prepare students through skill-oriented courses with ethical values.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">M3.</span>Promote research to benefit society.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">M4.</span>Strengthen relationships with all stakeholders.</li>
            </ul>
          </div>
        </motion.section>

        {/* Programmes */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Programmes Offered</h2>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">B.Tech (Undergraduate)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {ugPrograms.map((p) => (
              <div key={p.name} className="flex items-center justify-between border border-border rounded-lg px-4 py-2.5 text-sm">
                <span className="text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">Intake: {p.intake}</span>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">M.Tech (Postgraduate)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pgPrograms.map((p) => (
              <div key={p} className="border border-border rounded-lg px-4 py-2.5 text-sm text-foreground">{p}</div>
            ))}
          </div>
        </motion.section>

        {/* Facilities */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Campus Facilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {facilities.map((f) => (
              <div key={f.name} className="border border-border rounded-xl p-5 space-y-1.5 hover:border-primary/30 transition-colors">
                <h3 className="font-semibold text-sm text-foreground">{f.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Placements */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Placement Track Record</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Year</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Students Placed</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Companies</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Highest Package</th>
                </tr>
              </thead>
              <tbody>
                {placementStats.map((r) => (
                  <tr key={r.year} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{r.year}</td>
                    <td className="py-2.5 px-3 text-foreground">{r.placed}</td>
                    <td className="py-2.5 px-3 text-foreground">{r.companies}</td>
                    <td className="py-2.5 px-3 text-foreground">{r.highest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Overall highest package: 40 LPA · Average: 4–5 LPA</p>
        </motion.section>

        {/* CTA */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="border border-border rounded-xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Be Part of the ADCET Alumni Family</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Whether you graduated last year or two decades ago, your connection to ADCET never ends. Join the portal to reconnect, mentor current students, and contribute to the legacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild><Link to="/login">Join the Network</Link></Button>
            <Button variant="outline" asChild>
              <a href="https://www.adcet.ac.in" target="_blank" rel="noopener noreferrer">Visit College Website ↗</a>
            </Button>
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold mb-4">Contact</h2>
          <div className="border border-border rounded-xl p-6 space-y-3 text-sm">
            <p className="font-medium text-foreground">Sant Dnyaneshwar Shikshan Sanstha's<br />Annasaheb Dange College of Engineering and Technology (ADCET), Ashta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
              <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />Ashta, Taluka Walwa, Dist. Sangli, Maharashtra 416 301</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 flex-shrink-0" />+91-8600600700</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 flex-shrink-0" />director@adcet.in</p>
              <p className="flex items-center gap-2"><Globe className="h-4 w-4 flex-shrink-0" />
                <a href="https://www.adcet.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">www.adcet.ac.in</a>
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      <footer className="border-t border-border bg-card py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Annasaheb Dange College of Engineering and Technology (ADCET), Ashta. All Rights Reserved.
      </footer>
    </div>
  );
}
