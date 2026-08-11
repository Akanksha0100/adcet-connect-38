/**
 * Offline city gazetteer — the first place `lib/geocode.ts` looks.
 *
 * Its job is *not* to be exhaustive. It covers the places ADCET alumni actually
 * live so that a fresh clone, a seeded database and the test suite all produce a
 * populated map with **zero network calls**; anything it misses falls through to
 * Nominatim in the backfill job, which then persists the answer as a
 * `GeoLocation` row. That is why adding a city here is optional, never required.
 *
 * Coordinates are city centroids from OpenStreetMap. Aliases exist because the
 * `city` field on a profile is free text, so the same place arrives spelled
 * several ways ("Bangalore"/"Bengaluru", "Gurgaon"/"Gurugram"); every alias
 * resolves to the same canonical entry and therefore the same map point.
 */
export interface GazetteerEntry {
  /** Display name used for the `GeoLocation` row and the map popup. */
  city: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
  /** Alternative spellings, in addition to `city` itself. */
  aliases?: string[];
}

/** ADCET campus — pinned on the map as the origin point, not an alumni location. */
export const CAMPUS = {
  name: "ADCET, Ashta",
  state: "Maharashtra",
  country: "India",
  lat: 16.9494,
  lng: 74.4092,
};

const IN = (city: string, state: string, lat: number, lng: number, aliases?: string[]): GazetteerEntry => ({
  city,
  state,
  country: "India",
  lat,
  lng,
  aliases,
});

const World = (city: string, country: string, lat: number, lng: number, aliases?: string[]): GazetteerEntry => ({
  city,
  country,
  lat,
  lng,
  aliases,
});

export const GAZETTEER: GazetteerEntry[] = [
  // === Maharashtra — the college's own catchment, so the densest section ===
  IN("Ashta", "Maharashtra", 16.9494, 74.4092),
  IN("Sangli", "Maharashtra", 16.8524, 74.5815),
  IN("Miraj", "Maharashtra", 16.8236, 74.6336),
  IN("Islampur", "Maharashtra", 17.0453, 74.2606),
  IN("Karad", "Maharashtra", 17.2895, 74.1817),
  IN("Satara", "Maharashtra", 17.6805, 74.0183),
  IN("Kolhapur", "Maharashtra", 16.705, 74.2433),
  IN("Ichalkaranji", "Maharashtra", 16.6886, 74.4606),
  IN("Pune", "Maharashtra", 18.5204, 73.8567, ["poona"]),
  IN("Pimpri-Chinchwad", "Maharashtra", 18.6298, 73.7997, ["pimpri", "chinchwad"]),
  IN("Mumbai", "Maharashtra", 19.076, 72.8777, ["bombay"]),
  IN("Navi Mumbai", "Maharashtra", 19.033, 73.0297),
  IN("Thane", "Maharashtra", 19.2183, 72.9781),
  IN("Nashik", "Maharashtra", 19.9975, 73.7898, ["nasik"]),
  IN("Nagpur", "Maharashtra", 21.1458, 79.0882),
  IN("Chhatrapati Sambhajinagar", "Maharashtra", 19.8762, 75.3433, ["aurangabad"]),
  IN("Solapur", "Maharashtra", 17.6599, 75.9064, ["sholapur"]),
  IN("Ratnagiri", "Maharashtra", 16.9902, 73.312),
  IN("Amravati", "Maharashtra", 20.9374, 77.7796),
  IN("Jalgaon", "Maharashtra", 21.0077, 75.5626),
  IN("Ahmednagar", "Maharashtra", 19.0952, 74.7496),
  IN("Latur", "Maharashtra", 18.4088, 76.5604),
  IN("Nanded", "Maharashtra", 19.1383, 77.321),
  IN("Akola", "Maharashtra", 20.7002, 77.0082),
  IN("Chiplun", "Maharashtra", 17.5333, 73.5167),

  // === Karnataka ===
  IN("Bengaluru", "Karnataka", 12.9716, 77.5946, ["bangalore"]),
  IN("Mysuru", "Karnataka", 12.2958, 76.6394, ["mysore"]),
  IN("Hubballi", "Karnataka", 15.3647, 75.124, ["hubli", "hubballidharwad"]),
  IN("Belagavi", "Karnataka", 15.8497, 74.4977, ["belgaum"]),
  IN("Mangaluru", "Karnataka", 12.9141, 74.856, ["mangalore"]),

  // === Rest of India ===
  IN("Hyderabad", "Telangana", 17.385, 78.4867),
  IN("Chennai", "Tamil Nadu", 13.0827, 80.2707, ["madras"]),
  IN("Coimbatore", "Tamil Nadu", 11.0168, 76.9558),
  IN("Kochi", "Kerala", 9.9312, 76.2673, ["cochin", "ernakulam"]),
  IN("Thiruvananthapuram", "Kerala", 8.5241, 76.9366, ["trivandrum"]),
  IN("New Delhi", "Delhi", 28.6139, 77.209),
  IN("Delhi", "Delhi", 28.7041, 77.1025),
  IN("Gurugram", "Haryana", 28.4595, 77.0266, ["gurgaon"]),
  IN("Faridabad", "Haryana", 28.4089, 77.3178),
  IN("Noida", "Uttar Pradesh", 28.5355, 77.391, ["greaternoida"]),
  IN("Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
  IN("Kanpur", "Uttar Pradesh", 26.4499, 80.3319),
  IN("Varanasi", "Uttar Pradesh", 25.3176, 82.9739, ["banaras"]),
  IN("Jaipur", "Rajasthan", 26.9124, 75.7873),
  IN("Jodhpur", "Rajasthan", 26.2389, 73.0243),
  IN("Ahmedabad", "Gujarat", 23.0225, 72.5714),
  IN("Surat", "Gujarat", 21.1702, 72.8311),
  IN("Vadodara", "Gujarat", 22.3072, 73.1812, ["baroda"]),
  IN("Rajkot", "Gujarat", 22.3039, 70.8022),
  IN("Gandhinagar", "Gujarat", 23.2156, 72.6369),
  IN("Indore", "Madhya Pradesh", 22.7196, 75.8577),
  IN("Bhopal", "Madhya Pradesh", 23.2599, 77.4126),
  IN("Jabalpur", "Madhya Pradesh", 23.1815, 79.9864),
  IN("Kolkata", "West Bengal", 22.5726, 88.3639, ["calcutta"]),
  IN("Bhubaneswar", "Odisha", 20.2961, 85.8245),
  IN("Patna", "Bihar", 25.5941, 85.1376),
  IN("Ranchi", "Jharkhand", 23.3441, 85.3096),
  IN("Jamshedpur", "Jharkhand", 22.8046, 86.2029),
  IN("Raipur", "Chhattisgarh", 21.2514, 81.6296),
  IN("Chandigarh", "Chandigarh", 30.7333, 76.7794),
  IN("Ludhiana", "Punjab", 30.901, 75.8573),
  IN("Amritsar", "Punjab", 31.634, 74.8723),
  IN("Dehradun", "Uttarakhand", 30.3165, 78.0322),
  IN("Guwahati", "Assam", 26.1445, 91.7362),
  IN("Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185, ["vizag"]),
  IN("Vijayawada", "Andhra Pradesh", 16.5062, 80.648),
  IN("Tirupati", "Andhra Pradesh", 13.6288, 79.4192),
  IN("Panaji", "Goa", 15.4909, 73.8278, ["goa", "panjim"]),
  IN("Srinagar", "Jammu and Kashmir", 34.0837, 74.7973),
  IN("Shimla", "Himachal Pradesh", 31.1048, 77.1734),

  // === International ===
  World("Dubai", "United Arab Emirates", 25.2048, 55.2708),
  World("Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773),
  World("Sharjah", "United Arab Emirates", 25.3463, 55.4209),
  World("Doha", "Qatar", 25.2854, 51.531),
  World("Muscat", "Oman", 23.588, 58.3829),
  World("Riyadh", "Saudi Arabia", 24.7136, 46.6753),
  World("Singapore", "Singapore", 1.3521, 103.8198),
  World("Kuala Lumpur", "Malaysia", 3.139, 101.6869),
  World("London", "United Kingdom", 51.5074, -0.1278),
  World("Manchester", "United Kingdom", 53.4808, -2.2426),
  World("Birmingham", "United Kingdom", 52.4862, -1.8904),
  World("Dublin", "Ireland", 53.3498, -6.2603),
  World("Berlin", "Germany", 52.52, 13.405),
  World("Munich", "Germany", 48.1351, 11.582, ["munchen"]),
  World("Frankfurt", "Germany", 50.1109, 8.6821),
  World("Paris", "France", 48.8566, 2.3522),
  World("Amsterdam", "Netherlands", 52.3676, 4.9041),
  World("Zurich", "Switzerland", 47.3769, 8.5417),
  World("Stockholm", "Sweden", 59.3293, 18.0686),
  World("Toronto", "Canada", 43.6532, -79.3832),
  World("Vancouver", "Canada", 49.2827, -123.1207),
  World("Calgary", "Canada", 51.0447, -114.0719),
  World("New York", "United States", 40.7128, -74.006, ["newyorkcity", "nyc"]),
  World("San Francisco", "United States", 37.7749, -122.4194),
  World("San Jose", "United States", 37.3382, -121.8863),
  World("Seattle", "United States", 47.6062, -122.3321),
  World("Austin", "United States", 30.2672, -97.7431),
  World("Chicago", "United States", 41.8781, -87.6298),
  World("Dallas", "United States", 32.7767, -96.797),
  World("Houston", "United States", 29.7604, -95.3698),
  World("Boston", "United States", 42.3601, -71.0589),
  World("Atlanta", "United States", 33.749, -84.388),
  World("Phoenix", "United States", 33.4484, -112.074),
  World("Charlotte", "United States", 35.2271, -80.8431),
  World("Detroit", "United States", 42.3314, -83.0458),
  World("Sydney", "Australia", -33.8688, 151.2093),
  World("Melbourne", "Australia", -37.8136, 144.9631),
  World("Brisbane", "Australia", -27.4698, 153.0251),
  World("Auckland", "New Zealand", -36.8485, 174.7633),
  World("Tokyo", "Japan", 35.6762, 139.6503),
  World("Seoul", "South Korea", 37.5665, 126.978),
  World("Hong Kong", "Hong Kong", 22.3193, 114.1694),
  World("Nairobi", "Kenya", -1.2921, 36.8219),
];
