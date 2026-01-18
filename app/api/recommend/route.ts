import { z } from "zod";

interface Facility {
  id: string;
  name: string;
  type: "emergency" | "urgent_care" | "clinic";
  address: string;
  lat: number;
  lng: number;
  hours: string;
  services: string[];
  phone?: string;
  website?: string;
  estimated_wait_minutes?: number;
}

// Mock facility database for demo
// In production: Google Places API + custom metadata
const MOCK_FACILITIES: Facility[] = [
  {
    id: "sf_general",
    name: "UCSF Medical Center",
    type: "emergency",
    address: "505 Parnassus Ave, San Francisco, CA",
    lat: 37.763,
    lng: -122.458,
    hours: "24/7",
    services: ["Trauma", "Cardiology", "Stroke Center", "Pediatric ER"],
    phone: "(415) 353-1111",
    website: "https://www.ucsfshealth.org",
    estimated_wait_minutes: 45,
  },
  {
    id: "zuckerberg_sf",
    name: "Zuckerberg SF General",
    type: "emergency",
    address: "1001 Potrero Ave, San Francisco, CA",
    lat: 37.765,
    lng: -122.406,
    hours: "24/7",
    services: ["Trauma Center", "Burn Unit", "Orthopedics"],
    phone: "(415) 206-8000",
    website: "https://sfgeneral.org",
    estimated_wait_minutes: 60,
  },
  {
    id: "kaiser_sf",
    name: "Kaiser Permanente SF",
    type: "urgent_care",
    address: "2425 Geary Blvd, San Francisco, CA",
    lat: 37.784,
    lng: -122.476,
    hours: "8 AM - 8 PM",
    services: ["Urgent Care", "Minor Surgery", "X-Ray"],
    phone: "(415) 202-2000",
    website: "https://www.kaiserpermanente.org",
    estimated_wait_minutes: 20,
  },
  {
    id: "cvs_urgent",
    name: "CVS MinuteClinic - Mission",
    type: "clinic",
    address: "2300 Mission St, San Francisco, CA",
    lat: 37.76,
    lng: -122.413,
    hours: "9 AM - 9 PM",
    services: ["Minor Illnesses", "Vaccinations", "Screenings"],
    estimated_wait_minutes: 5,
  },
];

interface RecommendationInput {
  user_lat: number;
  user_lng: number;
  severity: 1 | 2 | 3 | 4 | 5;
  facility_type_needed: "emergency" | "urgent_care" | "clinic";
  consider_wait_times?: boolean;
}

interface FacilityWithScore extends Facility {
  distance_miles: number;
  estimated_eta_minutes: number;
  total_time_minutes: number;
  score: number;
  reasoning: string[];
}

interface RecommendationResult {
  recommended_facility: FacilityWithScore;
  alternatives: FacilityWithScore[];
  explanation: string;
  disclaimer: string;
}

// Simple distance calculation (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate ETA based on distance and time of day
function estimateETA(
  distance: number,
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
): number {
  // Average speeds by time of day (mph)
  const speeds: Record<string, number> = {
    morning: 15, // 7-11 AM, rush hour
    afternoon: 20, // 11 AM - 4 PM
    evening: 12, // 4-7 PM, rush hour
    night: 30, // 7 PM - 7 AM
  };

  const speed = speeds[timeOfDay] || 20;
  return Math.ceil((distance / speed) * 60); // Convert to minutes
};

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

export async function scoreFacilities(
  input: RecommendationInput
): Promise<FacilityWithScore[]> {
  const timeOfDay = getTimeOfDay();

  // Filter facilities by type needed
  const candidates = MOCK_FACILITIES.filter(
    (f) =>
      f.type === input.facility_type_needed ||
      (input.facility_type_needed === "emergency" && f.type === "emergency") ||
      (input.facility_type_needed === "urgent_care" &&
        (f.type === "urgent_care" || f.type === "emergency"))
  );

  const scored = candidates.map((facility) => {
    const distance = calculateDistance(
      input.user_lat,
      input.user_lng,
      facility.lat,
      facility.lng
    );

    const eta = estimateETA(distance, timeOfDay);
    const waitTime = facility.estimated_wait_minutes || 15;
    const totalTime = eta + waitTime;

    // Scoring formula (weighted)
    // Distance/ETA: 40%, Wait time: 30%, Facility match: 20%, Type match: 10%
    let score = 0;

    // Normalize ETA (max 30 min = 100%)
    const etaScore = Math.max(0, 100 - (eta / 30) * 100);
    score += etaScore * 0.4;

    // Normalize wait time (max 60 min = 100%)
    const waitScore = Math.max(0, 100 - (waitTime / 60) * 100);
    score += waitScore * 0.3;

    // Facility type match
    const typeMatchScore = facility.type === input.facility_type_needed ? 100 : 75;
    score += typeMatchScore * 0.2;

    // Severity appropriateness
    const severityMatchScore =
      input.severity >= 4 && facility.type === "emergency"
        ? 100
        : input.severity <= 2 && facility.type === "clinic"
          ? 100
          : input.severity === 3 && facility.type === "urgent_care"
            ? 100
            : 75;
    score += severityMatchScore * 0.1;

    const reasoning: string[] = [];
    if (distance < 2) reasoning.push(`Very close (${distance.toFixed(1)} miles)`);
    if (eta < 10) reasoning.push("Quick ETA");
    if (waitTime < 20) reasoning.push("Low wait time");
    if (facility.type === input.facility_type_needed)
      reasoning.push("Matches facility type needed");

    return {
      ...facility,
      distance_miles: parseFloat(distance.toFixed(1)),
      estimated_eta_minutes: eta,
      total_time_minutes: totalTime,
      score: Math.round(score),
      reasoning,
    };
  });

  // Sort by score (highest first)
  return scored.sort((a, b) => b.score - a.score);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input: RecommendationInput = {
      user_lat: parseFloat(body.user_lat),
      user_lng: parseFloat(body.user_lng),
      severity: body.severity,
      facility_type_needed: body.facility_type_needed,
      consider_wait_times: body.consider_wait_times !== false,
    };

    const scored = await scoreFacilities(input);

    if (scored.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No facilities found matching your criteria",
        },
        { status: 404 }
      );
    }

    const recommended = scored[0];
    const alternatives = scored.slice(1, 3);

    const explanation =
      `Based on your location and symptoms, we recommend ${recommended.name}. ` +
      `It's approximately ${recommended.distance_miles} miles away with an estimated ETA of ${recommended.estimated_eta_minutes} minutes ` +
      `and typical wait time of ${recommended.estimated_wait_minutes} minutes. ` +
      `Recommendation factors: ${recommended.reasoning.join(", ")}.`;

    const result: RecommendationResult = {
      recommended_facility: recommended,
      alternatives,
      explanation,
      disclaimer:
        "This tool provides routing guidance only and does not constitute medical advice. " +
        "For life-threatening emergencies, call 911 immediately.",
    };

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Recommendation failed";
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
