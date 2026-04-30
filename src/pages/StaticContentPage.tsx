import { motion } from "framer-motion";
import { useSiteContent, type SiteContentKey } from "@/lib/siteContent";

interface Props {
  contentKey: SiteContentKey;
}

/**
 * Generic page renderer for the admin-managed static sections
 * (About, Support, Contact, News, Mentorship, Resources).
 */
const StaticContentPage = ({ contentKey }: Props) => {
  const content = useSiteContent();
  const section = content[contentKey];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{section.title}</h1>
      </div>
      <div className="card-elevated p-6">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{section.body}</p>
      </div>
    </motion.div>
  );
};

export default StaticContentPage;