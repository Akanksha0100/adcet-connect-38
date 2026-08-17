/**
 * Esteemed alumni featured on the public pages.
 *
 * The roster is transcribed from `public/EsteemedAlumni/Alumni.md`, which the
 * Alumni Cell maintains — that file is the record, this is the rendered copy.
 * Keep them in step when the office sends an update.
 *
 * Three rules the pages depend on:
 *
 *  1. **Name, batch and designation.** Those are the three lines the tiles
 *     render, and the batch is the graduating year exactly as Alumni.md
 *     records it. Department is in Alumni.md but deliberately not modelled
 *     here, because nothing renders it; an unused field just invites drift.
 *  2. **The array is ordered by seniority**, most senior first, and every
 *     surface renders it in that order. The landing-page strip therefore leads
 *     with the most senior alumni and mixes departments naturally, rather than
 *     needing a separate "featured" list to maintain.
 *  3. **Everyone has their own portrait.** The shared stand-in image is gone,
 *     and `photo` is required rather than optional, so adding an alumnus
 *     without one is a type error instead of a silently broken tile.
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
  /** Graduating year, as published in Alumni.md — shown under the name. */
  batch: number;
  /** Current designation — the last line shown under the name. */
  position: string;
  /** Portrait in `public/EsteemedAlumni/` — required; see rule 3. */
  photo: string;
  category: EsteemedCategoryId;
}

const dir = "/EsteemedAlumni";

/** Ordered by seniority, most senior first — see rule 2 above. */
export const ESTEEMED_ALUMNI: EsteemedAlumnus[] = [
  // Founders and chief executives
  { name: "Ajit Metkari", batch: 2019, position: "Founder and CEO, Flymore Drones, Pune", photo: `${dir}/AjitMetkariAero.png`, category: "entrepreneurs" },
  { name: "Anand Magar", batch: 2010, position: "CEO, Mediastroke Web Services, Pune", photo: `${dir}/AnandMagar.png`, category: "entrepreneurs" },
  { name: "Bharat Lohar", batch: 2018, position: "Managing Director, DWBL Technologies Pvt. Ltd., Pune", photo: `${dir}/BharatLoharAero.png`, category: "entrepreneurs" },

  // Directors
  { name: "Vikas Gaikwad", batch: 2005, position: "Director, Product Management, Mastercard", photo: `${dir}/VikasGaikwad.png`, category: "leadership" },
  { name: "Simeent Gondkar", batch: 2004, position: "Director Data Engineering, Mastercard, Pune", photo: `${dir}/SimeentGondkar.png`, category: "leadership" },
  { name: "Rushikesh Patil", batch: 2019, position: "Director, KPMG, Mumbai", photo: `${dir}/RushikeshPatilAero.png`, category: "leadership" },
  { name: "Vaibhav Bane", batch: 2003, position: "Associate Director, Aecom India Pvt Ltd, Mumbai", photo: `${dir}/VaibhavBane.png`, category: "leadership" },
  { name: "Vikas Temkar", batch: 2003, position: "Director, Madbull Technologies, Pune", photo: `${dir}/VikasTemkar.png`, category: "entrepreneurs" },
  { name: "Abhijeet More", batch: 2014, position: "Director, Cyin Solutions Pvt. Ltd.", photo: `${dir}/AbhijeetMore.png`, category: "entrepreneurs" },
  { name: "Ninad Zende", batch: 2004, position: "Director, Zobotic Automation, Pune", photo: `${dir}/NinadZende.png`, category: "entrepreneurs" },
  { name: "Sagar More", batch: 2009, position: "Director, Utopia Optovision, Satara", photo: `${dir}/SagarMore.png`, category: "entrepreneurs" },

  // Vice presidents and general managers
  { name: "Vishwajit Sande", batch: 2011, position: "Vice President - Delivery, Mindbowser, Pune", photo: `${dir}/VishwajitSande.png`, category: "leadership" },
  { name: "Abhijit Patil", batch: 2004, position: "Assistant Vice President, Bharat Forge, Pune", photo: `${dir}/AbhijeetPatil.png`, category: "leadership" },
  { name: "Vishal Tingare", batch: 2005, position: "General Manager, Vodafone Idea Limited, Pune", photo: `${dir}/VishalTingare.png`, category: "leadership" },
  { name: "Ravindra Pawar", batch: 2003, position: "Assistant General Manager, Kirloskar Brothers Ltd., Pune", photo: `${dir}/RavindraPawar.png`, category: "leadership" },
  { name: "Mayur Tapase", batch: 2012, position: "DYSP, Government of Maharashtra", photo: `${dir}/MayurTapase.png`, category: "civil-services" },

  // Senior managers and team leads
  { name: "Bharat Malgave", batch: 2005, position: "Senior Project Manager, LTM", photo: `${dir}/BharatMalgave.png`, category: "leadership" },
  { name: "Swapnil Manglekar", batch: 2007, position: "Senior R&D Team Leader, Knorr Bremse Technology, Pune", photo: `${dir}/SwapnilManglekar.png`, category: "leadership" },
  { name: "Abhijeet Desai", batch: 2003, position: "Senior Manager, HCL, USA", photo: `${dir}/AbhijeetDesai2003.png`, category: "leadership" },
  { name: "Chandrashekhar N.", batch: 2003, position: "Senior Manager, Tata Motors, Pune", photo: `${dir}/Chandrashekhar.png`, category: "leadership" },

  // Armed forces and civil services
  { name: "Jyoti Pyati", batch: 2023, position: "Lieutenant, Indian Army, All India Rank - 1", photo: `${dir}/JyotiPyatiAero.png`, category: "civil-services" },
  { name: "Snehal Mali", batch: 2021, position: "Lieutenant, Indian Army", photo: `${dir}/SnehalMali.png`, category: "civil-services" },
  { name: "Sandesh Sawant", batch: 2020, position: "Police Sub-Inspector (PSI), All Maharashtra Rank - 28", photo: `${dir}/SandeshSawant.png`, category: "civil-services" },
  { name: "Niketan Todkar", batch: 2019, position: "Section Officer, In 2024 Rajyaseva Exam", photo: `${dir}/NiketanTodkar.png`, category: "civil-services" },
  { name: "Abhishek Virbhadhre", batch: 2021, position: "Assistant Loco Pilot, Railway Recruitment Board (RRB)", photo: `${dir}/AbhishekVirbhadre.png`, category: "civil-services" },

  // Specialist engineers
  { name: "Vikas Patil", batch: 2018, position: "Senior Engineer, Rolls-Royce - Engines", photo: `${dir}/VikasPatilAero.png`, category: "leadership" },
  { name: "Priyanka Hankare", batch: 2017, position: "Aerodynamics Engineer, Airbus, Bengaluru", photo: `${dir}/PriyankaHankareAero.png`, category: "leadership" },
  { name: "Vaishnavi Furmalakar", batch: 2022, position: "Associate Electrical Design and Analysis Engineer, Boeing, Bengaluru", photo: `${dir}/V.FurmalkarAero.png`, category: "leadership" },
  { name: "Trunika Bhujbal", batch: 2023, position: "Composite Manufacturing Engineer, Skyroot Aerospace, Hyderabad", photo: `${dir}/TrunikaBhujbalAero.png`, category: "leadership" },
  { name: "Akshata Mali", batch: 2018, position: "CAE Analyst, Mercedes-Benz Research and Development India", photo: `${dir}/AkshataMaliAero.png`, category: "leadership" },
];

export const esteemedByCategory = (id: EsteemedCategoryId) =>
  ESTEEMED_ALUMNI.filter((a) => a.category === id);
