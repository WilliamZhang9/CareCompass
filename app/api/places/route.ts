import { NextRequest, NextResponse } from 'next/server';

// Quebec ER data types
interface QuebecERData {
  name: string;
  normalizedName: string;
  totalPeople: number;
  waitingToSeeDoctor: number;
  occupancyRate: number;
  estimatedWaitMinutes: number;
}

// Types for Google Places API (New) response
interface PlaceLocation {
  latitude: number;
  longitude: number;
}

interface Place {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: PlaceLocation;
  types: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions: string[];
  };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
}

interface PlacesResponse {
  places: Place[];
}

// Map Google Place types to our facility types
function mapPlaceType(types: string[], primaryType?: string, name?: string): 'emergency' | 'urgent_care' | 'clinic' {
  const typeSet = new Set(types);
  const nameLower = (name || '').toLowerCase();

  // Check name for specific facility type indicators
  const hospitalKeywords = [
    'hospital', 'hôpital', 'hopital',
    'chum', 'muhc', 'cusm',
    'royal victoria', 'jewish general', 'montreal general',
    'notre-dame', 'sacré-coeur', 'maisonneuve', 'st. mary',
    'children\'s hospital', 'hôpital pour enfants',
    'ste-justine', 'sainte-justine',
    'lakeshore general', 'verdun hospital',
    'hôtel-dieu', 'hotel dieu',
  ];

  const urgentCareKeywords = [
    'urgent care', 'urgence', 'emergency',
    'walk-in', 'sans rendez-vous',
    'super clinic', 'superclinic',
  ];

  const clinicKeywords = [
    'clinic', 'clinique',
    'clsc',
    'medical center', 'centre médical', 'centre medical',
    'health center', 'centre de santé', 'centre de sante',
    'gp ', 'family medicine', 'médecine familiale',
    'polyclinic', 'polyclinique',
    'gmf', // Groupe de médecine de famille
  ];

  // Check name-based keywords (most specific first)
  if (hospitalKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'emergency';
  }

  if (urgentCareKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'urgent_care';
  }

  if (clinicKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'clinic';
  }

  // Fall back to Google Place types
  if (primaryType === 'hospital' || primaryType === 'emergency_room') {
    return 'emergency';
  }

  if (typeSet.has('hospital') || typeSet.has('emergency_room')) {
    return 'emergency';
  }
  if (typeSet.has('urgent_care_center') || typeSet.has('urgent_care')) {
    return 'urgent_care';
  }

  // If it's a medical/health establishment but not hospital, it's a clinic
  if (typeSet.has('doctor') || typeSet.has('health') || typeSet.has('medical_center')) {
    return 'clinic';
  }

  // Default to clinic for other medical facilities
  return 'clinic';
}

// Filter out specialty practices that aren't relevant for emergency/urgent care
function isRelevantMedicalFacility(place: Place): boolean {
  const name = place.displayName.text.toLowerCase();
  const types = place.types || [];

  // Exclude specialty practices by name keywords
  const excludeKeywords = [
    'hearing', 'audiology', 'audiologist',
    'dental', 'dentist', 'orthodont',
    'optometry', 'optometrist', 'eye care', 'vision',
    'chiropractic', 'chiropractor',
    'physiotherapy', 'physio',
    'massage', 'spa',
    'pharmacy', 'drugstore',
    'veterinary', 'vet ', 'animal',
    'cosmetic', 'plastic surgery', 'aestheti',
    'dermatology', 'skin care',
    'fertility', 'ivf',
    'weight loss', 'diet',
    'acupuncture',
    'naturopath',
    'podiatr', 'foot care',
    'sleep clinic',
    'lab ', 'laboratory',
    'imaging', 'radiology', 'x-ray', 'mri', 'ct scan',
  ];

  // Check if name contains excluded keywords
  if (excludeKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }

  // Exclude by Google Place types
  const excludeTypes = [
    'dentist',
    'pharmacy',
    'physiotherapist',
    'veterinary_care',
    'spa',
    'beauty_salon',
  ];

  if (excludeTypes.some(type => types.includes(type))) {
    return false;
  }

  // Include keywords that indicate relevant facilities
  const includeKeywords = [
    'hospital', 'hopital', 'hôpital',
    'emergency', 'urgence',
    'clinic', 'clinique',
    'medical center', 'centre médical',
    'health center', 'centre de santé',
    'clsc',
    'chum', 'muhc', 'cusm',
    'children', 'enfants',
    'general', 'général',
    'university', 'universitaire',
    'royal victoria',
    'jewish general', 'juif',
    'notre-dame', 'sacré-coeur', 'maisonneuve',
    'urgent care', 'walk-in', 'sans rendez-vous',
  ];

  // If it's marked as hospital type, include it
  if (types.includes('hospital')) {
    return true;
  }

  // Check for include keywords in name
  if (includeKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }

  // If primary type is hospital or health-related, include it
  if (place.primaryType === 'hospital' || place.primaryType === 'medical_center') {
    return true;
  }

  // Default: exclude if we're not sure
  return false;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

// Estimate ETA based on distance (assuming avg 30 km/h in city)
function estimateETA(distanceKm: number): number {
  return Math.round(distanceKm * 2); // ~30 km/h = 2 min per km
}

// Generate realistic wait time estimates based on facility type and time of day
function estimateWaitTime(type: 'emergency' | 'urgent_care' | 'clinic'): number {
  const hour = new Date().getHours();
  const isPeakHours = (hour >= 9 && hour <= 11) || (hour >= 17 && hour <= 20);

  const baseWaits = {
    emergency: isPeakHours ? 60 : 40,
    urgent_care: isPeakHours ? 35 : 20,
    clinic: isPeakHours ? 20 : 10,
  };

  // Add some randomness (±20%)
  const base = baseWaits[type];
  const variance = Math.round(base * 0.2 * (Math.random() * 2 - 1));
  return Math.max(5, base + variance);
}

// Map services based on facility type
function getServices(type: 'emergency' | 'urgent_care' | 'clinic', types: string[]): string[] {
  const serviceMap = {
    emergency: ['Emergency', 'Trauma Care', '24/7 Services', 'Critical Care'],
    urgent_care: ['Urgent Care', 'Walk-in', 'Minor Injuries', 'Lab Work'],
    clinic: ['General Practice', 'Consultations', 'Check-ups', 'Vaccinations'],
  };

  return serviceMap[type];
}

// Normalize hospital name for matching with Quebec ER data
function normalizeHospitalName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Better hospital name matching with Montreal-specific keywords
function findERMatch(hospitalName: string, erData: QuebecERData[]): QuebecERData | null {
  const normalized = normalizeHospitalName(hospitalName);

  // Define specific keyword mappings for Montreal hospitals
  const keywordMappings: Record<string, string[]> = {
    'CHUM': ['CHUM', 'CENTRE HOSPITALIER DE L\'UNIVERSITE DE MONTREAL'],
    'MUHC': ['MCGILL', 'GLEN', 'ROYAL VICTORIA'],
    'ROYAL VICTORIA': ['ROYAL VICTORIA'],
    'JEWISH GENERAL': ['JUIF', 'JEWISH'],
    'MONTREAL CHILDREN': ['MONTREAL POUR ENFANTS', 'CHILDREN'],
    'SAINTE-JUSTINE': ['SAINTE-JUSTINE', 'STE-JUSTINE'],
    'NOTRE-DAME': ['NOTRE-DAME'],
    'ST. MARY': ['ST. MARY', 'MARY'],
    'SACRE-COEUR': ['SACRE-COEUR', 'SACRE COEUR'],
    'MAISONNEUVE': ['MAISONNEUVE'],
    'LACHINE': ['LACHINE'],
    'VERDUN': ['VERDUN'],
    'LASALLE': ['LASALLE'],
    'FLEURY': ['FLEURY'],
    'JEAN-TALON': ['JEAN-TALON'],
    'SANTA CABRINI': ['SANTA CABRINI', 'CABRINI'],
    'LAKESHORE': ['LAKESHORE'],
    'DOUGLAS': ['DOUGLAS'],
  };

  // Check for specific keyword matches first
  for (const [key, keywords] of Object.entries(keywordMappings)) {
    if (keywords.some(kw => normalized.includes(normalizeHospitalName(kw)))) {
      // Find matching ER data
      const match = erData.find(er =>
        keywords.some(kw => normalizeHospitalName(er.name).includes(normalizeHospitalName(kw)))
      );
      if (match) return match;
    }
  }

  // Try direct name matching (must have significant overlap)
  const words = normalized.split(' ').filter(w => w.length > 3);

  for (const er of erData) {
    const erNormalized = normalizeHospitalName(er.name);

    // Check if at least 2 significant words match
    let matchCount = 0;
    for (const word of words) {
      if (erNormalized.includes(word)) {
        matchCount++;
      }
    }
    if (matchCount >= 2) {
      return er;
    }
  }

  return null;
}

// Fetch Quebec ER data from our API
async function fetchQuebecERData(baseUrl: string): Promise<QuebecERData[]> {
  try {
    const response = await fetch(`${baseUrl}/api/quebec-er`, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      console.error('Failed to fetch Quebec ER data:', response.status);
      return [];
    }

    const data = await response.json();
    return data.hospitals || [];
  } catch (error) {
    console.error('Error fetching Quebec ER data:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, radius = 5000, types } = await request.json();

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Use Google Places API (New) - Nearby Search
    // Valid types: hospital, doctor, pharmacy, physiotherapist, dentist
    const includedTypes = types || ['hospital'];

    const placesResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.currentOpeningHours,places.primaryType,places.primaryTypeDisplayName',
        },
        body: JSON.stringify({
          includedTypes: includedTypes,
          locationRestriction: {
            circle: {
              center: {
                latitude: latitude,
                longitude: longitude,
              },
              radius: radius, // radius in meters
            },
          },
          maxResultCount: 20,
          languageCode: 'en',
        }),
      }
    );

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch places', details: errorText },
        { status: placesResponse.status }
      );
    }

    const data: PlacesResponse = await placesResponse.json();

    // Fetch Quebec ER data for real wait times
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const quebecERData = await fetchQuebecERData(baseUrl);

    console.log(`Fetched ${quebecERData.length} Quebec ER records`);

    // Filter to only relevant medical facilities (hospitals, ERs, clinics)
    const relevantPlaces = (data.places || []).filter(place => isRelevantMedicalFacility(place));
    console.log(`Filtered ${data.places?.length || 0} places down to ${relevantPlaces.length} relevant facilities`);

    // Transform Google Places data to our Hospital format
    const hospitals = relevantPlaces.map((place) => {
      const type = mapPlaceType(place.types, place.primaryType, place.displayName.text);
      const distance = calculateDistance(latitude, longitude, place.location.latitude, place.location.longitude);

      // Try to find matching Quebec ER data for real wait times
      const erMatch = findERMatch(place.displayName.text, quebecERData);

      // Use real Quebec data if available, otherwise estimate
      let waitTime = estimateWaitTime(type);
      let occupancyRate: number | undefined;
      let waitingCount: number | undefined;
      let waitTimeSource: 'live' | 'estimated' = 'estimated';

      if (erMatch) {
        waitTime = erMatch.estimatedWaitMinutes;
        occupancyRate = erMatch.occupancyRate;
        waitingCount = erMatch.waitingToSeeDoctor;
        waitTimeSource = 'live';
        console.log(`Matched: ${place.displayName.text} -> ${erMatch.name} (${occupancyRate}% occupancy)`);
      }

      return {
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        lat: place.location.latitude,
        lng: place.location.longitude,
        type,
        phone: place.internationalPhoneNumber || place.nationalPhoneNumber || 'N/A',
        distance,
        eta: estimateETA(distance),
        rating: place.rating || 4.0,
        services: getServices(type, place.types),
        waitTime,
        waitTimeSource,
        occupancyRate,
        waitingCount,
        isOpen: place.currentOpeningHours?.openNow,
        ratingCount: place.userRatingCount,
      };
    });

    // Sort by combined ETA + wait time
    hospitals.sort((a, b) => (a.eta + a.waitTime) - (b.eta + b.waitTime));

    const liveCount = hospitals.filter(h => h.waitTimeSource === 'live').length;

    return NextResponse.json({
      hospitals,
      source: 'google_places',
      waitTimeSource: liveCount > 0 ? 'quebec_index_sante' : 'estimated',
      liveWaitTimeCount: liveCount,
      count: hospitals.length,
    });

  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '45.5047');
  const lng = parseFloat(searchParams.get('lng') || '-73.5771');
  const radius = parseInt(searchParams.get('radius') || '5000');

  // Redirect to POST handler
  const fakeRequest = {
    json: async () => ({ latitude: lat, longitude: lng, radius }),
  } as NextRequest;

  return POST(fakeRequest);
}
