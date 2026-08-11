import { motion } from "framer-motion";
import { Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import PageHero from "@/components/public/PageHero";
import SocialLinks from "@/components/public/SocialLinks";
import { CONTACT } from "@/lib/site";
import { ALUMNI_CELL_INCHARGE } from "@/lib/board";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function ContactPage() {
  return (
    <PublicLayout title="Contact Us">
      <PageHero title="Contact Us" subtitle="ADCET Alumni Cell, Ashta" />

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        {/* Who to ask for — the alumni office is one person, so name them. */}
        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Alumni Cell In-charge</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border border-border rounded-xl p-6 bg-muted/20">
            <img
              src={ALUMNI_CELL_INCHARGE.photo}
              alt={ALUMNI_CELL_INCHARGE.name}
              loading="lazy"
              className="w-28 h-32 rounded-lg object-cover object-top ring-1 ring-border shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="text-lg font-semibold text-foreground">{ALUMNI_CELL_INCHARGE.name}</p>
              <p className="text-sm text-primary mt-0.5">{ALUMNI_CELL_INCHARGE.designation}</p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                For alumni registrations, chapter activity, reunions and institutional partnerships, write to{" "}
                <a href={`mailto:${CONTACT.email}`} className="text-primary hover:underline">
                  {CONTACT.email}
                </a>{" "}
                or call the numbers below.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section {...fade}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Get in Touch</h2>
          <div className="w-14 h-0.5 bg-primary/50 mb-6" />

          <dl className="divide-y divide-border border-y border-border">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                Address
              </dt>
              <dd className="text-sm text-foreground leading-relaxed">
                {CONTACT.society}
                <br />
                Annasaheb Dange College of Engineering and Technology,
                <br />
                {CONTACT.address}
              </dd>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                Contact No.
              </dt>
              <dd className="text-sm text-foreground">
                {CONTACT.phones.map((p, i) => (
                  <span key={p}>
                    <a href={`tel:+91${p}`} className="hover:text-primary transition-colors">
                      {p}
                    </a>
                    {i < CONTACT.phones.length - 1 && " / "}
                  </span>
                ))}
              </dd>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                Email
              </dt>
              <dd className="text-sm text-foreground">
                <a href={`mailto:${CONTACT.email}`} className="hover:text-primary transition-colors">
                  {CONTACT.email}
                </a>
              </dd>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                Office Hours
              </dt>
              <dd className="text-sm text-foreground">{CONTACT.officeHours}</dd>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                Website
              </dt>
              <dd className="text-sm text-foreground">
                <a
                  href={CONTACT.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {CONTACT.websiteLabel}
                </a>
              </dd>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-2 sm:gap-4 py-4 items-center">
              <dt className="text-sm text-muted-foreground">Follow Us</dt>
              <dd>
                <SocialLinks />
              </dd>
            </div>
          </dl>
        </motion.section>

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
      </div>
    </PublicLayout>
  );
}
