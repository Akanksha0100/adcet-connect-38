import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const news = [
  {
    date: "June 2026",
    title: "ADCET Hackathon 2026 – Season 3 Now Open",
    body: "ADCET Hackathon Season 3 is underway, themed around Sustainable Development Goals (SDGs) and Vikasit Bharat-2047. Alumni are invited to mentor student teams and participate as judges.",
    link: "https://www.adcet.ac.in",
  },
  {
    date: "2026",
    title: "Alumni Database Update Drive",
    body: "ADCET has launched a drive to update its alumni database. If you graduated from ADCET, fill in the Google Form to ensure you receive alumni portal invitations, event notifications and placement referral opportunities.",
    link: "https://forms.gle/wfafkr3xvBxDGPup6",
  },
  {
    date: "2025–26",
    title: "Placement Season 2025–26 Ongoing",
    body: "90+ companies have visited campus this placement season. CSE students saw packages up to 10 LPA. Alumni working in industry are encouraged to refer open positions to the Placement Cell.",
    link: null,
  },
  {
    date: "2025",
    title: "NAAC A++ Reaffirmation",
    body: "ADCET has once again been reaffirmed with the NAAC A++ grade — the highest accreditation a college can achieve in India. This recognition reflects our commitment to quality education, research, and student outcomes.",
    link: null,
  },
  {
    date: "2025",
    title: "JSW Foundation-Sponsored Innovation: Plastic Bottle Shredder",
    body: "A team of ADCET engineering students designed and developed a Plastic Bottle Shredding Machine sponsored by JSW Foundation — a practical solution addressing the plastic waste problem in rural Maharashtra.",
    link: null,
  },
  {
    date: "Ongoing",
    title: "Research & Publications",
    body: "ADCET faculty and students publish research papers in national and international journals annually. Alumni with industry research experience are welcome to collaborate on funded projects and consultancy.",
    link: "https://www.adcet.ac.in",
  },
];

export default function NewsPage() {
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
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">News & Announcements</h1>
          <p className="text-primary-foreground/70 text-sm">Latest updates from ADCET campus and the alumni community</p>
        </motion.div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-5">
        {news.map((n, i) => (
          <motion.article key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="border border-border rounded-xl p-6 space-y-2 hover:border-primary/30 transition-colors">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{n.date}</p>
            <h2 className="font-semibold text-foreground">{n.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
            {n.link && (
              <a href={n.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                Read more <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </motion.article>
        ))}

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="bg-muted/40 border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Sign in to see real-time news, announcements from the alumni office, and event updates published to the portal.
          </p>
          <Button asChild><Link to="/login">Sign In for Full Access</Link></Button>
        </motion.div>
      </div>

      <footer className="border-t border-border bg-card py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Annasaheb Dange College of Engineering and Technology (ADCET), Ashta. All Rights Reserved.
      </footer>
    </div>
  );
}
