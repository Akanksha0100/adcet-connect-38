import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import SocialLinks from "@/components/public/SocialLinks";
import { CONTACT } from "@/lib/site";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const details = [
  {
    icon: MapPin,
    label: "Address",
    lines: [CONTACT.society, "Annasaheb Dange College of Engineering and Technology", CONTACT.address],
    href: CONTACT.mapsUrl,
  },
  {
    icon: Phone,
    label: "Contact No.",
    lines: [CONTACT.phones.join(" / ")],
    href: `tel:+91${CONTACT.phones[0]}`,
  },
  {
    icon: Mail,
    label: "Email",
    lines: [CONTACT.email],
    href: `mailto:${CONTACT.email}`,
  },
  {
    icon: Clock,
    label: "Office Hours",
    lines: [CONTACT.officeHours],
    href: null,
  },
  {
    icon: Globe,
    label: "Website",
    lines: [CONTACT.websiteLabel],
    href: CONTACT.website,
  },
];

export default function ContactPage() {
  return (
    <PublicLayout>
      <PageHero
        title="Contact Us"
        subtitle="Reach the ADCET Alumni Cell for membership, chapters, events and portal support"
      />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Details */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Alumni Cell</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.map((d) => (
              <div
                key={d.label}
                className="border border-border rounded-xl p-5 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2.5">
                  <d.icon className="h-3.5 w-3.5" />
                  {d.label}
                </div>
                {d.href ? (
                  <a
                    href={d.href}
                    target={d.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:text-primary transition-colors leading-relaxed block"
                  >
                    {d.lines.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </a>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">
                    {d.lines.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}

            <div className="border border-border rounded-xl p-5 bg-card">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-3">Follow Us</p>
              <SocialLinks />
            </div>
          </div>
        </motion.section>

        {/* Map */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Find Us</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="rounded-xl overflow-hidden border border-border">
            <iframe
              title="ADCET Ashta location map"
              src="https://www.google.com/maps?q=Annasaheb%20Dange%20College%20of%20Engineering%20and%20Technology%20Ashta&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-[320px] sm:h-[400px] border-0"
            />
          </div>
          <a
            href={CONTACT.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline mt-3"
          >
            Open in Google Maps ↗
          </a>
        </motion.section>

        {/* Support */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Portal Support</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="bg-muted/30 border border-border rounded-xl p-6 text-sm text-muted-foreground space-y-3">
            <p>Trouble with your account, registration or portal access? Here's the quickest way to get help:</p>
            <ul className="list-disc ml-5 space-y-1.5">
              <li>
                Email{" "}
                <a href={`mailto:${CONTACT.email}`} className="text-foreground hover:underline">
                  {CONTACT.email}
                </a>{" "}
                with the subject "Portal Support"
              </li>
              <li>
                Call{" "}
                {CONTACT.phones.map((p, i) => (
                  <span key={p}>
                    <a href={`tel:+91${p}`} className="text-foreground hover:underline">
                      {p}
                    </a>
                    {i < CONTACT.phones.length - 1 ? " / " : ""}
                  </span>
                ))}{" "}
                during office hours
              </li>
              <li>Once signed in, raise a support request from your dashboard for the fastest response</li>
            </ul>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fade} className="border border-border rounded-2xl p-8 text-center bg-muted/20">
          <h2 className="text-xl font-bold mb-2">Already Registered?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
            Sign in to access the full alumni portal — events, jobs board, alumni directory, achievements and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/login">Sign In to Your Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/about">About the Alumni Cell</Link>
            </Button>
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
}
