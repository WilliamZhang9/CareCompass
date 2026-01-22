// OpenStreetMap API utilities for geocoding and nearby search

interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

/**
 * Geocode a location string to coordinates using Nominatim API
 */
export async function geocodeLocation(location: string): Promise<GeocodingResult | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'CareCompass/1.0 (medical-facility-finder)',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Search for nearby shops/amenities using Overpass API
 */
export async function searchNearbyShops(
  lat: number,
  lon: number,
  radiusMeters: number = 3000,
  type?: string
): Promise<OSMNode[]> {
  try {
    // Build Overpass query for shops/amenities
    let amenityFilter = '';
    if (type) {
      // Map common types to OSM amenity tags
      const typeMapping: Record<string, string> = {
        hospital: 'hospital',
        clinic: 'clinic',
        pharmacy: 'pharmacy',
        doctors: 'doctors',
        dentist: 'dentist',
        restaurant: 'restaurant',
        cafe: 'cafe',
        fast_food: 'fast_food',
        shop: 'shop',
      };
      const osmType = typeMapping[type.toLowerCase()] || type;
      amenityFilter = `["amenity"="${osmType}"]`;
    } else {
      // Default to hospitals and clinics for medical facilities
      amenityFilter = '["amenity"~"hospital|clinic|pharmacy|doctors"]';
    }

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node${amenityFilter}(around:${radiusMeters},${lat},${lon});
        way${amenityFilter}(around:${radiusMeters},${lat},${lon});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      console.error('Overpass API failed:', response.statusText);
      return [];
    }

    const data = await response.json();

    // Process nodes and ways
    const results: OSMNode[] = [];

    for (const element of data.elements || []) {
      if (element.type === 'node') {
        results.push({
          id: element.id,
          lat: element.lat,
          lon: element.lon,
          tags: element.tags || {},
        });
      } else if (element.type === 'way' && element.center) {
        // For ways, use the center point
        results.push({
          id: element.id,
          lat: element.center.lat,
          lon: element.center.lon,
          tags: element.tags || {},
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Overpass search error:', error);
    return [];
  }
}
