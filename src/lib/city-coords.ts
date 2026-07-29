/**
 * City → coordinate lookup for the public alumni map.
 *
 * Alumni profiles store a free-text city, so the map resolves those strings
 * against this table. Add an entry here when a new city shows up unplaced —
 * keys are lower-cased and punctuation-stripped, so "New Delhi", "new-delhi"
 * and "NEW DELHI" all match the same record.
 */
export interface CityCoord {
  lat: number;
  lng: number;
  /** Region label shown in the marker popup. */
  region: string;
}

/** ADCET campus — always pinned on the map. */
export const CAMPUS = {
  name: "ADCET, Ashta",
  lat: 16.9494,
  lng: 74.4092,
};

const C = (lat: number, lng: number, region: string): CityCoord => ({ lat, lng, region });

const CITIES: Record<string, CityCoord> = {
  // Maharashtra
  ashta: C(16.9494, 74.4092, "Maharashtra"),
  sangli: C(16.8524, 74.5815, "Maharashtra"),
  miraj: C(16.8236, 74.6336, "Maharashtra"),
  islampur: C(17.0453, 74.2606, "Maharashtra"),
  karad: C(17.2895, 74.1817, "Maharashtra"),
  satara: C(17.6805, 74.0183, "Maharashtra"),
  kolhapur: C(16.705, 74.2433, "Maharashtra"),
  ichalkaranji: C(16.6886, 74.4606, "Maharashtra"),
  pune: C(18.5204, 73.8567, "Maharashtra"),
  pimprichinchwad: C(18.6298, 73.7997, "Maharashtra"),
  mumbai: C(19.076, 72.8777, "Maharashtra"),
  navimumbai: C(19.033, 73.0297, "Maharashtra"),
  thane: C(19.2183, 72.9781, "Maharashtra"),
  nashik: C(19.9975, 73.7898, "Maharashtra"),
  nagpur: C(21.1458, 79.0882, "Maharashtra"),
  aurangabad: C(19.8762, 75.3433, "Maharashtra"),
  chhatrapatisambhajinagar: C(19.8762, 75.3433, "Maharashtra"),
  solapur: C(17.6599, 75.9064, "Maharashtra"),
  ratnagiri: C(16.9902, 73.312, "Maharashtra"),
  amravati: C(20.9374, 77.7796, "Maharashtra"),
  jalgaon: C(21.0077, 75.5626, "Maharashtra"),

  // Karnataka
  bengaluru: C(12.9716, 77.5946, "Karnataka"),
  bangalore: C(12.9716, 77.5946, "Karnataka"),
  mysuru: C(12.2958, 76.6394, "Karnataka"),
  mysore: C(12.2958, 76.6394, "Karnataka"),
  hubli: C(15.3647, 75.124, "Karnataka"),
  belagavi: C(15.8497, 74.4977, "Karnataka"),
  belgaum: C(15.8497, 74.4977, "Karnataka"),
  mangaluru: C(12.9141, 74.856, "Karnataka"),

  // Rest of India
  hyderabad: C(17.385, 78.4867, "Telangana"),
  chennai: C(13.0827, 80.2707, "Tamil Nadu"),
  coimbatore: C(11.0168, 76.9558, "Tamil Nadu"),
  kochi: C(9.9312, 76.2673, "Kerala"),
  thiruvananthapuram: C(8.5241, 76.9366, "Kerala"),
  newdelhi: C(28.6139, 77.209, "Delhi"),
  delhi: C(28.7041, 77.1025, "Delhi"),
  gurugram: C(28.4595, 77.0266, "Haryana"),
  gurgaon: C(28.4595, 77.0266, "Haryana"),
  noida: C(28.5355, 77.391, "Uttar Pradesh"),
  lucknow: C(26.8467, 80.9462, "Uttar Pradesh"),
  kanpur: C(26.4499, 80.3319, "Uttar Pradesh"),
  jaipur: C(26.9124, 75.7873, "Rajasthan"),
  ahmedabad: C(23.0225, 72.5714, "Gujarat"),
  surat: C(21.1702, 72.8311, "Gujarat"),
  vadodara: C(22.3072, 73.1812, "Gujarat"),
  rajkot: C(22.3039, 70.8022, "Gujarat"),
  indore: C(22.7196, 75.8577, "Madhya Pradesh"),
  bhopal: C(23.2599, 77.4126, "Madhya Pradesh"),
  kolkata: C(22.5726, 88.3639, "West Bengal"),
  bhubaneswar: C(20.2961, 85.8245, "Odisha"),
  patna: C(25.5941, 85.1376, "Bihar"),
  ranchi: C(23.3441, 85.3096, "Jharkhand"),
  raipur: C(21.2514, 81.6296, "Chhattisgarh"),
  chandigarh: C(30.7333, 76.7794, "Chandigarh"),
  ludhiana: C(30.901, 75.8573, "Punjab"),
  dehradun: C(30.3165, 78.0322, "Uttarakhand"),
  guwahati: C(26.1445, 91.7362, "Assam"),
  visakhapatnam: C(17.6868, 83.2185, "Andhra Pradesh"),
  vijayawada: C(16.5062, 80.648, "Andhra Pradesh"),
  goa: C(15.2993, 74.124, "Goa"),
  panaji: C(15.4909, 73.8278, "Goa"),

  // International
  dubai: C(25.2048, 55.2708, "United Arab Emirates"),
  abudhabi: C(24.4539, 54.3773, "United Arab Emirates"),
  doha: C(25.2854, 51.531, "Qatar"),
  singapore: C(1.3521, 103.8198, "Singapore"),
  london: C(51.5074, -0.1278, "United Kingdom"),
  manchester: C(53.4808, -2.2426, "United Kingdom"),
  berlin: C(52.52, 13.405, "Germany"),
  munich: C(48.1351, 11.582, "Germany"),
  amsterdam: C(52.3676, 4.9041, "Netherlands"),
  zurich: C(47.3769, 8.5417, "Switzerland"),
  toronto: C(43.6532, -79.3832, "Canada"),
  vancouver: C(49.2827, -123.1207, "Canada"),
  newyork: C(40.7128, -74.006, "United States"),
  sanfrancisco: C(37.7749, -122.4194, "United States"),
  sanjose: C(37.3382, -121.8863, "United States"),
  seattle: C(47.6062, -122.3321, "United States"),
  austin: C(30.2672, -97.7431, "United States"),
  chicago: C(41.8781, -87.6298, "United States"),
  dallas: C(32.7767, -96.797, "United States"),
  boston: C(42.3601, -71.0589, "United States"),
  atlanta: C(33.749, -84.388, "United States"),
  sydney: C(-33.8688, 151.2093, "Australia"),
  melbourne: C(-37.8136, 144.9631, "Australia"),
  tokyo: C(35.6762, 139.6503, "Japan"),
};

const normalise = (city: string) => city.toLowerCase().replace(/[^a-z]/g, "");

/** Resolve a free-text city name to coordinates, or `null` if unmapped. */
export const coordsFor = (city: string): CityCoord | null => CITIES[normalise(city)] ?? null;
