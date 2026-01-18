# MCP Integration Guide - Emergency Router with Montreal Facilities Map

## Overview

This document explains how the Model Context Protocol (MCP) server integrates with the Emergency Router application to provide intelligent facility recommendations for Montreal, Canada, centered around McGill University.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React/Next.js)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Emergency Router (/emergency-router)            │  │
│  │  - Symptom input                                 │  │
│  │  - Severity assessment                           │  │
│  │  - Voice input/output                            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Facilities Map (/emergency-map)                 │  │
│  │  - Interactive map (Leaflet)                     │  │
│  │  - Facility filtering                            │  │
│  │  - Distance/ETA display                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ├─ Calls /api/triage
                         │
                         ├─ Calls /api/recommend
                         │
                         └─ Calls MCP endpoints
                              (if using MCP)
         ┌────────────────────────────────────┐
         │      Backend APIs (Next.js)        │
         ├────────────────────────────────────┤
         │  /api/triage                       │
         │  - Symptom classification          │
         │  - Severity determination          │
         │  - Red flag detection              │
         ├────────────────────────────────────┤
         │  /api/recommend                    │
         │  - Facility scoring                │
         │  - Distance calculation            │
         │  - ETA estimation                  │
         └────────────────────────────────────┘
                         │
                         └─ Uses Montreal facility database
                              (hardcoded in route handlers)
                         
┌─────────────────────────────────────────────────────────┐
│     MCP Server (Optional Enhancement)                   │
│     (/app/mcp/emergency-router-mcp.ts)                 │
│                                                         │
│  Tools:                                                 │
│  - search_facilities()    Search by type/location     │
│  - get_facility_details() Get full facility info      │
│  - find_nearest_emergency() Quick nearest ER          │
│                                                         │
│  Resources:                                             │
│  - emergency-map-widget   Interactive map UI          │
└─────────────────────────────────────────────────────────┘
```

## Montreal Database

The system includes 9 medical facilities in Montreal:

### Emergency Rooms (5)
- **McGill University Health Centre (MUHC)** - 1.5 km from McGill
- **Royal Victoria Hospital** - 0.6 km (closest!)
- **Jewish General Hospital** - 2.1 km
- **Hôpital du Sacré-Cœur de Montréal** - 4.1 km
- **Hôpital Maisonneuve-Rosemont** - 3.2 km

### Urgent Care (2)
- **Hôpital Saint-Luc** - 1.2 km
- **Hôpital Général de Montréal** - 0.9 km

### Clinics (2)
- **McGill Clinic - Downtown** - 0.8 km
- **Downtown Medical Clinic** - 1.3 km

**Reference Point:** McGill University (45.5047, -73.5771)

## Key Integration Points

### 1. Triage System (`/api/triage`)

**Request:**
```json
{
  "symptoms": "chest pain and shortness of breath",
  "severity_self_report": 4,
  "hasComorbidities": false,
  "isPregnant": false,
  "recentTrauma": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "severity": 5,
    "facility_type": "emergency",
    "red_flags": ["chest pain", "shortness of breath"],
    "recommendation": "EMERGENCY: Call 911 immediately",
    "should_call_911": true
  }
}
```

### 2. Recommendation System (`/api/recommend`)

**Request:**
```json
{
  "user_lat": 45.5047,
  "user_lng": -73.5771,
  "severity": 5,
  "facility_type_needed": "emergency"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommended_facility": {
      "id": "royal-vic",
      "name": "Royal Victoria Hospital",
      "distance_miles": 0.37,
      "estimated_eta_minutes": 4,
      "score": 95,
      "reasoning": ["Very close", "Matches facility type"]
    },
    "alternatives": [...],
    "explanation": "Based on your location...",
    "disclaimer": "This tool provides routing guidance only..."
  }
}
```

### 3. MCP Tools (Optional)

If running MCP server at `localhost:3001`:

```typescript
// Search for facilities
search_facilities({
  facility_type: "emergency",
  lat: 45.5047,
  lng: -73.5771,
  radius_km: 5,
  severity: "critical"
})

// Get facility details
get_facility_details({
  name: "Royal Victoria Hospital"
})

// Find nearest emergency
find_nearest_emergency({
  lat: 45.5047,
  lng: -73.5771
})
```

## File Structure

```
app/
├── api/
│   ├── triage/
│   │   └── route.ts              # Symptom classification
│   └── recommend/
│       └── route.ts              # Facility recommendation
│
├── emergency-router/
│   └── page.tsx                  # Main routing UI
│
├── emergency-map/
│   └── page.tsx                  # Facilities map view
│
├── mcp/
│   └── emergency-router-mcp.ts   # MCP server (optional)
│
├── components/
│   └── voice-input-button.tsx    # Voice I/O component
│
└── lib/
    └── voice.ts                  # Voice utilities

public/
└── emergency-map-widget.html     # Leaflet map widget
```

## Location Coordinates

### Reference Points
- **McGill University**: 45.5047, -73.5771 (starting point)
- **Downtown Montreal**: 45.5017, -73.5627

### Hospital Coordinates
All hospitals are pre-configured with:
- Exact latitude/longitude
- Distance from McGill (km)
- ETA estimation (minutes, based on traffic patterns)
- Services available
- Contact information
- Hours of operation

## Distance & ETA Calculation

```typescript
// Haversine formula for distance
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * π/180;
  const dLng = (lng2 - lng1) * π/180;
  const a = sin²(dLat/2) + cos(lat1)*cos(lat2)*sin²(dLng/2);
  const c = 2*atan2(√a, √(1-a));
  return R * c;
}

// ETA estimation (time of day aware)
// Based on distance and typical traffic:
// Morning (7-11 AM): 15 mph
// Afternoon (11-16): 20 mph
// Evening (16-19): 12 mph
// Night (19-7): 30 mph
```

## Integration Workflow

### Scenario 1: User Reports Critical Symptoms

1. User enters: "chest pain, can't breathe"
2. **Triage API** detects red flags → Severity 5
3. **Recommend API** filters for emergency rooms
4. System calculates nearest ER from McGill
5. **Royal Victoria Hospital** (0.6 km, 4 min ETA) is recommended
6. **Voice Output** speaks directions
7. **Map View** shows facility location

### Scenario 2: User Browses Facilities

1. User clicks "🗺️ View Facilities Map"
2. **Emergency Map** page loads
3. Shows all 9 facilities on interactive Leaflet map
4. User filters by type (emergency/urgent/clinic)
5. Clicking facility shows:
   - Full details
   - Distance & ETA
   - Services offered
   - Contact info
6. Can be linked to directions (Google Maps)

## How to Use

### For End Users

**Via Emergency Router:**
```
1. Go to http://localhost:3001/emergency-router
2. Describe symptoms
3. Get facility recommendation
4. Click "View Facilities Map" for more options
```

**Via Map Directly:**
```
1. Go to http://localhost:3001/emergency-map
2. Browse all facilities in Montreal
3. Filter by type
4. View distance & ETA from McGill
5. Click facility for details
```

### For Developers

**Add New Facility:**
Edit `/app/api/recommend/route.ts`:
```typescript
{
  id: "new-facility",
  name: "Hospital Name",
  type: "emergency",
  address: "Address",
  lat: 45.5xxx,
  lng: -73.5xxx,
  services: ["Service1", "Service2"],
  estimated_wait_minutes: 20,
}
```

**Customize Recommendation Scoring:**
Modify weights in `/app/api/recommend/route.ts`:
```typescript
// Change importance of factors
score += etaScore * 0.5;        // Make distance more important
score += waitScore * 0.2;       // Less important than distance
score += typeMatchScore * 0.2;
score += severityMatchScore * 0.1;
```

**Run MCP Server Separately:**
```bash
# Terminal 1: Start MCP server
node app/mcp/emergency-router-mcp.ts

# Terminal 2: Start Next.js app
npm run dev
```

## API Response Examples

### Triage Response (Moderate Case)
```json
{
  "severity": 3,
  "facility_type": "urgent_care",
  "red_flags": [],
  "reasoning": "Moderate symptoms warrant urgent evaluation",
  "recommendation": "Visit an Urgent Care clinic today",
  "should_call_911": false
}
```

### Recommend Response (Top 3 Facilities)
```json
{
  "recommended_facility": {
    "name": "Royal Victoria Hospital",
    "distance_km": 0.6,
    "estimated_eta_minutes": 4,
    "score": 95,
    "services": ["Emergency", "Trauma", "ICU", "Surgery"]
  },
  "alternatives": [
    {
      "name": "McGill University Health Centre",
      "distance_km": 1.5,
      "estimated_eta_minutes": 8,
      "score": 88
    },
    {
      "name": "Hôpital Général de Montréal",
      "distance_km": 0.9,
      "estimated_eta_minutes": 5,
      "score": 82
    }
  ],
  "explanation": "Based on your location and severity level...",
  "disclaimer": "This tool provides routing guidance only..."
}
```

## Environment Variables

No special environment variables required for Montreal facilities integration.

Optional (for production):
```
GOOGLE_MAPS_API_KEY=your_key_here      # To upgrade to real maps
HOSPITAL_API_KEY=your_key_here         # For real wait times
```

## Testing

### Test Case 1: Critical Emergency
- Input: "chest pain, difficulty breathing"
- Expected: Severity 5, Call 911 alert, Nearest ER recommendation

### Test Case 2: Moderate Issue
- Input: "bad headache, fever"
- Expected: Severity 3, Urgent Care recommendation

### Test Case 3: Minor Issue
- Input: "sore throat"
- Expected: Severity 1, Clinic recommendation

### Test Case 4: Map View
- Navigate to `/emergency-map`
- Filter by "Emergency Rooms"
- Verify all 5 ERs display with correct distances
- Click facility to see details

## Future Enhancements

1. **Real Data Integration**
   - Google Maps Places API for live facility search
   - Real-time wait times from hospital systems
   - Hospital ratings from HealthGrades

2. **Expanded Coverage**
   - All of Quebec province
   - All of Canada
   - International support

3. **Advanced Features**
   - Insurance provider filtering
   - Specialist availability
   - Bed availability checking
   - Patient transfer routing

4. **Mobile App**
   - Native iOS/Android
   - Offline maps
   - Emergency contact sharing
   - Background location tracking

## Troubleshooting

### Map not displaying
- Check if Leaflet CDN is accessible
- Verify coordinates are valid (45.X, -73.X for Montreal)
- Check browser console for errors

### API returning 400 error
- Verify required fields in request body
- Check that lat/lng are numbers (not strings)
- Ensure severity is between 1-5

### Voice not working
- Check browser permissions for microphone
- Verify speech recognition is supported (Chrome, Firefox, Safari 14.1+)
- Check browser console for permission errors

### No facilities found
- Verify radius_km is large enough (default: 5 km)
- Check facility_type filter (use "all" to see everything)
- Confirm search coordinates are in Montreal area

---

**Last Updated:** January 2025
**Coverage Area:** Montreal, Quebec, Canada
**Reference Point:** McGill University (45.5047, -73.5771)
