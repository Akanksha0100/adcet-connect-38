/**
 * Esteemed alumni featured on the public pages.
 *
 * Photographs live in `public/EsteemedAlumni/`. Each person carries an optional
 * `category` — leave it `null` and they appear only in the "All Esteemed Alumni"
 * roll; set it to a category id below and they also appear in that section.
 * `position` is displayed under the name; when it is empty the department is
 * shown instead, so entries can be filled in gradually.
 */
export type EsteemedCategoryId = "leadership" | "entrepreneurs" | "civil-services";

export interface EsteemedCategory {
  id: EsteemedCategoryId;
  title: string;
  description: string;
}

export const ESTEEMED_CATEGORIES: EsteemedCategory[] = [
  {
    id: "leadership",
    title: "Leaders in Industry & Academia",
    description:
      "Alumni holding senior leadership positions across corporations, research organisations and institutions in India and abroad.",
  },
  {
    id: "entrepreneurs",
    title: "Entrepreneurs & Innovators",
    description:
      "Founders and job creators who have built companies, products and ventures out of an idea they carried from campus.",
  },
  {
    id: "civil-services",
    title: "Civil Services & Public Administration",
    description:
      "Alumni serving the nation through the civil services, defence, public sector undertakings and government administration.",
  },
];

export interface EsteemedAlumnus {
  name: string;
  /** Current designation — shown under the name once the alumni office supplies it. */
  position: string;
  department?: string;
  batch?: string;
  photo: string;
  category: EsteemedCategoryId | null;
}

const dir = "/EsteemedAlumni";
const AERO = "Aeronautical Engineering";

export const ESTEEMED_ALUMNI: EsteemedAlumnus[] = [
  { name: "Abhijeet Desai", position: "", batch: "2003", photo: `${dir}/AbhijeetDesai2003.png`, category: null },
  { name: "Ajit Metkari", position: "", department: AERO, photo: `${dir}/AjitMetkariAero.png`, category: null },
  { name: "Akshata Mali", position: "", department: AERO, photo: `${dir}/AkshataMaliAero.png`, category: null },
  { name: "Bharat Lohar", position: "", department: AERO, photo: `${dir}/BharatLoharAero.png`, category: null },
  { name: "Jyoti Pyati", position: "", department: AERO, photo: `${dir}/JyotiPyatiAero.png`, category: null },
  { name: "Priyanka Hankare", position: "", department: AERO, photo: `${dir}/PriyankaHankareAero.png`, category: null },
  { name: "Rushikesh Patil", position: "", department: AERO, photo: `${dir}/RushikeshPatilAero.png`, category: null },
  { name: "Trunika Bhujbal", position: "", department: AERO, photo: `${dir}/TrunikaBhujbalAero.png`, category: null },
  { name: "V. Furmalkar", position: "", department: AERO, photo: `${dir}/V.FurmalkarAero.png`, category: null },
  { name: "Vikas Patil", position: "", department: AERO, photo: `${dir}/VikasPatilAero.png`, category: null },
];

/** Composite board of esteemed alumni — shown full-width on the detail page only. */
export const ESTEEMED_GENERAL_IMAGE = `${dir}/EsteemedAlumniGeneral.png`;

/** Line rendered beneath a name in listings. */
export const subtitleOf = (a: EsteemedAlumnus) =>
  a.position || a.department || (a.batch ? `Batch of ${a.batch}` : "");
