import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import { NEWSLETTERS } from "@/lib/site";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

interface NewsItem {
  date: string;
  tag: string;
  title: string;
  body: string;
  link: string | null;
}

const news: NewsItem[] = [
  {
    date: "June 2026",
    tag: "Campus",
    title: "ADCET Hackathon 2026 – Season 3 Now Open",
    body: "ADCET Hackathon Season 3 is underway, themed around Sustainable Development Goals (SDGs) and Vikasit Bharat-2047. Alumni are invited to mentor student teams and participate as judges.",
    link: "https://www.adcet.ac.in",
  },
  {
    date: "2026",
    tag: "Alumni Cell",
    title: "Alumni Database Update Drive",
    body: "ADCET has launched a drive to update its alumni database. If you graduated from ADCET, fill in the form to ensure you receive alumni portal invitations, event notifications and placement referral opportunities.",
    link: "https://forms.gle/wfafkr3xvBxDGPup6",
  },
  {
    date: "2025–26",
    tag: "Placements",
    title: "Placement Season 2025–26 Ongoing",
    body: "Companies continue to visit campus through this placement season. Alumni working in industry are encouraged to refer open positions to the Placement Cell.",
    link: null,
  },
  {
    date: "2025",
    tag: "Accreditation",
    title: "NAAC A++ Reaffirmation",
    body: "ADCET has once again been reaffirmed with the NAAC A++ grade — the highest accreditation a college can achieve in India. This recognition reflects our commitment to quality education, research, and student outcomes.",
    link: null,
  },
  {
    date: "2025",
    tag: "Innovation",
    title: "JSW Foundation-Sponsored Innovation: Plastic Bottle Shredder",
    body: "A team of ADCET engineering students designed and developed a Plastic Bottle Shredding Machine sponsored by JSW Foundation — a practical solution addressing the plastic waste problem in rural Maharashtra.",
    link: null,
  },
  {
    date: "Ongoing",
    tag: "Research",
    title: "Research & Publications",
    body: "ADCET faculty and students publish research papers in national and international journals annually. Alumni with industry research experience are welcome to collaborate on funded projects and consultancy.",
    link: "https://www.adcet.ac.in",
  },
];

export default function NewsPage() {
  return (
    <PublicLayout title="News & Announcements">
      <PageHero
        title="News & Announcements"
        subtitle="Updates from the ADCET campus and the alumni community"
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Updates */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Latest Updates</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="space-y-4">
            {news.map((n) => (
              <motion.article
                key={n.title}
                {...fade}
                className="border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {n.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{n.date}</span>
                </div>
                <h3 className="font-semibold text-foreground leading-snug mb-2">{n.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                {n.link && (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
                  >
                    Read more <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* Newsletters */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Alumni Newsletters</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
            Longer reads on alumni achievements, chapter activities and campus developments, published by the Alumni
            Cell.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {NEWSLETTERS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 border border-border rounded-xl p-5 bg-card hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF · Opens in a new tab</p>
                </div>
              </a>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fade} className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <Newspaper className="h-7 w-7 text-primary/40 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Get the Full Picture</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Sign in to see real-time announcements from the alumni office, event invitations and job postings shared
            by fellow alumni.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/login">Sign In for Full Access</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/gallery">Browse the Gallery</Link>
            </Button>
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
}
