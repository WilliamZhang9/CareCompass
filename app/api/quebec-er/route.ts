import { NextRequest, NextResponse } from 'next/server';

// Quebec ER Wait Time data from Index Santé
// This scrapes real-time data from https://www.indexsante.ca/urgences/

interface QuebecERData {
  name: string;
  normalizedName: string;
  totalPeople: number;
  waitingToSeeDoctor: number;
  functionalStretchers: number;
  occupiedStretchers: number;
  occupancyRate: number; // percentage
  patientsOver24h: number;
  patientsOver48h: number;
  lastUpdated: string;
}

// Normalize hospital name for matching
function normalizeHospitalName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, "'")
    .replace(/CENTRE HOSPITALIER DE L'UNIVERSITE DE MONTREAL/g, 'CHUM')
    .replace(/CENTRE HOSPITALIER/g, 'CH')
    .replace(/CENTRE UNIVERSITAIRE DE SANTE MCGILL/g, 'CUSM')
    .replace(/HOPITAL ROYAL VICTORIA.*GLEN/gi, 'ROYAL VICTORIA')
    .replace(/HOPITAL GENERAL JUIF/g, 'JEWISH GENERAL')
    .replace(/L'HOPITAL DE MONTREAL POUR ENFANTS/g, 'MONTREAL CHILDREN')
    .replace(/CHU SAINTE-JUSTINE/g, 'SAINTE JUSTINE')
    .replace(/HOPITAL/g, '')
    .replace(/HOSPITAL/g, '')
    .replace(/DE |DU |DES |LA |LE |L'|LES /g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse HTML to extract ER data
function parseERData(html: string): QuebecERData[] {
  const results: QuebecERData[] = [];

  // Extract hospital rows using regex
  // Pattern: <tr><td...><a href="...">HOSPITAL NAME</a></td><td...>N</td>...occupancy%...</tr>
  const rowPattern = /<tr><td[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td>.*?<td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)%<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><\/tr>/gi;

  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const [, name, totalPeople, waitingToSee, functional, occupied, occupancy, over24, over48] = match;

    if (name && !name.includes('colspan')) {
      results.push({
        name: name.trim(),
        normalizedName: normalizeHospitalName(name),
        totalPeople: parseInt(totalPeople) || 0,
        waitingToSeeDoctor: parseInt(waitingToSee) || 0,
        functionalStretchers: parseInt(functional) || 0,
        occupiedStretchers: parseInt(occupied) || 0,
        occupancyRate: parseInt(occupancy) || 0,
        patientsOver24h: parseInt(over24) || 0,
        patientsOver48h: parseInt(over48) || 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return results;
}

// Estimate wait time based on occupancy rate and people waiting
function estimateWaitTimeFromOccupancy(data: QuebecERData): number {
  // Base wait time formula:
  // - Factor in occupancy rate (higher = longer wait)
  // - Factor in people waiting to see doctor
  // - Factor in stretcher availability

  const occupancyFactor = data.occupancyRate / 100;
  const waitingFactor = data.waitingToSeeDoctor;

  // Base wait: 15 min per person waiting, multiplied by occupancy
  let estimatedMinutes = waitingFactor * 15 * Math.max(0.5, occupancyFactor);

  // Add penalty for high occupancy
  if (data.occupancyRate > 150) {
    estimatedMinutes *= 1.5;
  } else if (data.occupancyRate > 100) {
    estimatedMinutes *= 1.2;
  }

  // Cap at reasonable values
  return Math.min(480, Math.max(15, Math.round(estimatedMinutes))); // 15 min to 8 hours
}

// Convert minutes to human readable format
function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

// Cache for ER data (refresh every 15 minutes)
let cachedData: { data: QuebecERData[]; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function fetchQuebecERData(): Promise<QuebecERData[]> {
  // Check cache
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    const response = await fetch('https://www.indexsante.ca/urgences/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const data = parseERData(html);

    // Update cache
    cachedData = { data, timestamp: Date.now() };

    return data;
  } catch (error) {
    console.error('Error fetching Quebec ER data:', error);
    // Return cached data even if expired, if available
    return cachedData?.data || [];
  }
}

// Find matching ER data for a hospital name
function findERDataForHospital(hospitalName: string, erData: QuebecERData[]): QuebecERData | null {
  const normalizedSearch = normalizeHospitalName(hospitalName);

  // Try exact match first
  let match = erData.find(er => er.normalizedName === normalizedSearch);
  if (match) return match;

  // Try partial match
  match = erData.find(er =>
    er.normalizedName.includes(normalizedSearch) ||
    normalizedSearch.includes(er.normalizedName)
  );
  if (match) return match;

  // Try keyword matching
  const keywords = normalizedSearch.split(' ').filter(k => k.length > 3);
  for (const keyword of keywords) {
    match = erData.find(er => er.normalizedName.includes(keyword));
    if (match) return match;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hospitalName = searchParams.get('hospital');

    const erData = await fetchQuebecERData();

    if (hospitalName) {
      // Find specific hospital
      const match = findERDataForHospital(hospitalName, erData);

      if (match) {
        const estimatedWait = estimateWaitTimeFromOccupancy(match);
        return NextResponse.json({
          found: true,
          hospital: match.name,
          occupancyRate: match.occupancyRate,
          waitingToSeeDoctor: match.waitingToSeeDoctor,
          totalPeople: match.totalPeople,
          estimatedWaitMinutes: estimatedWait,
          estimatedWaitFormatted: formatWaitTime(estimatedWait),
          patientsOver24h: match.patientsOver24h,
          lastUpdated: match.lastUpdated,
          source: 'index_sante_quebec',
        });
      } else {
        return NextResponse.json({
          found: false,
          hospital: hospitalName,
          message: 'Hospital not found in Quebec ER database',
        });
      }
    }

    // Return all data
    const enrichedData = erData.map(er => ({
      ...er,
      estimatedWaitMinutes: estimateWaitTimeFromOccupancy(er),
      estimatedWaitFormatted: formatWaitTime(estimateWaitTimeFromOccupancy(er)),
    }));

    return NextResponse.json({
      count: enrichedData.length,
      lastUpdated: cachedData?.timestamp ? new Date(cachedData.timestamp).toISOString() : null,
      source: 'index_sante_quebec',
      hospitals: enrichedData,
    });

  } catch (error) {
    console.error('Quebec ER API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Quebec ER data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
