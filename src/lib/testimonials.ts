/**
 * Alumni testimonials shown on the landing page.
 *
 * Quotes are reproduced verbatim as supplied by the Alumni Cell — edit them only
 * with the alumnus' consent. Portraits live in `public/Testimonials/` and are
 * referenced as `photo` (optional — initials are used when absent).
 */
export interface Testimonial {
  name: string;
  role: string;
  batch?: string;
  quote: string;
  photo?: string;
}

const dir = "/Testimonials";

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ganeshprasad Nikam",
    role: "Principal Lead, Forbes Marshall",
    batch: "Batch of 2003",
    photo: `${dir}/GaneshprasadNikam.png`,
    quote:
      "ADCET played a vital role in shaping my engineering career by providing a strong academic foundation and practical exposure. The guidance of dedicated faculty, hands-on learning, and opportunities to work on real-world projects helped me develop the technical and professional skills required in the industry. The values and confidence I gained during my time at ADCET continue to support my growth as a professional. I am proud to be associated with my alma mater and look forward to contributing through mentoring, industry interaction, and opportunities for students.",
  },
  {
    name: "Sagar Anturkar",
    role: "Director, Verolt",
    batch: "Batch of 2005",
    photo: `${dir}/SagarAnturkar.png`,
    quote:
      "The entrepreneurial mindset I developed at ADCET inspired me to establish my own business. The encouragement to think creatively and solve practical problems has been instrumental in my journey as an entrepreneur. I am always happy to support students through mentoring and career guidance.",
  },
  {
    name: "Abhijeet Desai",
    role: "Associate General Manager, HCL Tech, USA",
    batch: "Batch of 2005",
    photo: `${dir}/AbhijeetDesai.png`,
    quote:
      "My journey at ADCET laid a strong foundation for my professional career. The institute provided an excellent learning environment, dedicated faculty, and opportunities to develop both technical expertise and leadership skills. The knowledge, discipline, and confidence I gained at ADCET have been instrumental in my journey to an international leadership role. I am proud to be an alumnus of ADCET and remain committed to supporting the institute by mentoring students, sharing industry insights, and contributing to internship and placement initiatives for future engineers.",
  },
  {
    name: "Vikas Gaikwad",
    role: "Director, Mastercard",
    batch: "Batch of 2005",
    photo: `${dir}/VikasGaikwad.png`,
    quote:
      "ADCET has been the cornerstone of my professional journey, providing me with a strong technical foundation and the confidence to take on global challenges. The institute's dedicated faculty, practical learning approach, and emphasis on innovation helped shape my problem-solving and leadership abilities. The values and experiences gained at ADCET have played a significant role in my career growth. It is a matter of pride to remain connected with my alma mater, and I look forward to supporting students through mentoring, career guidance, internships, and industry collaboration.",
  },
];

export const initialsOfName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
