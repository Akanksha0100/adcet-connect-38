/**
 * Department-wise alumni count maintained by the Alumni Cell.
 * `null` marks an academic year in which the programme had no graduating batch.
 */
export interface AlumniCountRow {
  department: string;
  upto2223: number | null;
  y2324: number | null;
  y2425: number | null;
  y2526: number | null;
  total: number;
}

export const ALUMNI_COUNT_YEARS = ["2002-03 to 2022-23", "2023-24", "2024-25", "2025-26"] as const;

export const ALUMNI_COUNT: AlumniCountRow[] = [
  { department: "Mechanical Engineering", upto2223: 2956, y2324: 112, y2425: 87, y2526: 95, total: 3250 },
  { department: "Computer Science Engineering", upto2223: 1249, y2324: 153, y2425: 138, y2526: 145, total: 1685 },
  { department: "Electrical Engineering", upto2223: 1290, y2324: 129, y2425: 126, y2526: 150, total: 1695 },
  { department: "Civil Engineering", upto2223: 716, y2324: 71, y2425: 79, y2526: 34, total: 900 },
  { department: "Aeronautical Engineering", upto2223: 425, y2324: 76, y2425: 33, y2526: 48, total: 582 },
  { department: "Food Technology", upto2223: 43, y2324: 40, y2425: 21, y2526: 8, total: 112 },
  { department: "Computer Science Engineering (IoT)", upto2223: null, y2324: null, y2425: 70, y2526: 69, total: 139 },
  { department: "Artificial Intelligence & Data Science (AI&DS)", upto2223: null, y2324: null, y2425: 71, y2526: 73, total: 144 },
  { department: "Electronics & Telecommunication Engineering", upto2223: 1597, y2324: null, y2425: null, y2526: null, total: 1597 },
  { department: "Information Technology", upto2223: 675, y2324: null, y2425: null, y2526: null, total: 675 },
  { department: "Automobile Engineering", upto2223: 424, y2324: null, y2425: null, y2526: null, total: 424 },
  { department: "Mechanical & Automation Engineering", upto2223: 53, y2324: null, y2425: null, y2526: null, total: 53 },
];

export const TOTAL_ALUMNI = ALUMNI_COUNT.reduce((sum, r) => sum + r.total, 0);
