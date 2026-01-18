# 🚑 Emergency Router - Complete Setup & Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation & Running

```bash
# Clone and navigate to project
cd /Users/saifshaikh/Desktop/projects/hackathons/mcp-servers/vercel-starter-example

# Install dependencies
npm install

# Start development server
npm run dev

# Server runs on http://localhost:3001
```

### Access the Application

1. **Homepage:** http://localhost:3001
2. **Emergency Router:** http://localhost:3001/emergency-router
3. **Facilities Map:** http://localhost:3001/emergency-map

---

## Features Overview

### 🚑 Emergency Router (`/emergency-router`)

**What it does:**
- Takes user symptoms in natural language
- Classifies severity level (1-5)
- Detects critical red flags
- Recommends appropriate facility type
- Shows ranked list of nearby facilities with ETA

**How to use:**
1. Describe your symptoms (e.g., "chest pain and shortness of breath")
2. Set severity level (1=mild, 5=critical)
3. Check any applicable risk factors
4. Click "Get Help"
5. System returns severity assessment + facility recommendations
6. Voice guidance speaks the recommendation

**Sample Test Cases:**
```
Critical Case:
- Symptoms: "chest pain, difficulty breathing"
- Expected: Severity 5, Call 911 alert, Nearest ER

Moderate Case:
- Symptoms: "fever and body aches"
- Expected: Severity 3, Urgent Care recommendation

Minor Case:
- Symptoms: "sore throat"
- Expected: Severity 1, Clinic recommendation
```

### 🗺️ Facilities Map (`/emergency-map`)

**What it does:**
- Shows all 9 medical facilities in Montreal
- Displays distance from McGill University
- Shows ETA based on facility type
- Lists services offered
- Filters by facility type

**How to use:**
1. Navigate to Emergency Map
2. Select facility type (Emergency/Urgent Care/Clinic)
3. Browse facility list on right sidebar
4. Click facility to see details
5. View distance, ETA, services, contact info

**Montreal Coverage:**
- 5 Emergency Rooms
- 2 Urgent Care Centers
- 2 Clinics
- All within 5km of McGill University

---

## API Endpoints

### 1. POST `/api/triage`
Analyzes symptoms and classifies severity.

**Request:**
```bash
curl -X POST http://localhost:3001/api/triage \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "chest pain and shortness of breath",
    "severity_self_report": 4,
    "age": 45,
    "hasComorbidities": true,
    "isPregnant": false,
    "recentTrauma": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "severity": 5,
    "facility_type": "emergency",
    "red_flags": ["chest pain", "shortness of breath"],
    "reasoning": "Critical symptoms detected...",
    "recommendation": "EMERGENCY: Call 911 immediately or go to nearest ER",
    "should_call_911": true
  }
}
```

### 2. POST `/api/recommend`
Finds and scores best facilities for user's situation.

**Request:**
```bash
curl -X POST http://localhost:3001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_lat": 45.5047,
    "user_lng": -73.5771,
    "severity": 5,
    "facility_type_needed": "emergency"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommended_facility": {
      "id": "royal-vic",
      "name": "Royal Victoria Hospital",
      "type": "emergency",
      "address": "687 Avenue des Pins Ouest, Montreal, QC H3A 1A1",
      "distance_miles": 0.37,
      "estimated_eta_minutes": 4,
      "score": 95,
      "reasoning": ["Very close (0.37 miles)", "Quick ETA", "Matches facility type"]
    },
    "alternatives": [
      {
        "id": "mcgill-emergency",
        "name": "McGill University Health Centre (MUHC)",
        "distance_miles": 0.93,
        "estimated_eta_minutes": 8,
        "score": 88
      }
    ],
    "explanation": "Based on your location and symptoms, we recommend Royal Victoria Hospital...",
    "disclaimer": "This tool provides routing guidance only and does not constitute medical advice..."
  }
}
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js 15, React 19 | UI & routing |
| Styling | Tailwind CSS | Design system |
| Maps | Leaflet.js | Interactive maps |
| Voice | Web Speech API | Voice input/output |
| Backend | Next.js API Routes | RESTful endpoints |
| Validation | Zod | Type safety |
| MCP (Optional) | @modelcontextprotocol/sdk | AI integration |

---

## Project Structure

```
/app
├── api/
│   ├── triage/
│   │   └── route.ts              # Severity classification
│   └── recommend/
│       └── route.ts              # Facility recommendation
├── emergency-router/
│   └── page.tsx                  # Main triage UI
├── emergency-map/
│   └── page.tsx                  # Facilities map view
├── components/
│   └── voice-input-button.tsx    # Voice input component
├── lib/
│   └── voice.ts                  # Voice utilities
├── mcp/
│   ├── index.ts                  # FastFood MCP server
│   └── emergency-router-mcp.ts   # Emergency Router MCP
├── hooks/                        # Custom React hooks
├── page.tsx                      # Homepage
└── layout.tsx                    # Root layout

/public
├── map-widget.html               # FastFood map widget
└── emergency-map-widget.html     # Emergency map widget

/docs
├── EMERGENCY_ROUTER_README.md    # Main documentation
└── MCP_INTEGRATION_GUIDE.md      # MCP integration docs
```

---

## Montreal Facilities Database

### 9 Pre-configured Facilities

#### Emergency Rooms (5)
1. **McGill University Health Centre (MUHC)**
   - Address: 1001 Boulevard Décarie
   - Distance: 1.5 km, ETA: 8 min
   - Rating: 4.5/5

2. **Royal Victoria Hospital** ⭐ (Closest)
   - Address: 687 Avenue des Pins Ouest
   - Distance: 0.6 km, ETA: 4 min
   - Rating: 4.4/5

3. **Jewish General Hospital**
   - Address: 3755 Côte-Sainte-Catherine
   - Distance: 2.1 km, ETA: 12 min
   - Rating: 4.3/5

4. **Hôpital du Sacré-Cœur de Montréal**
   - Address: 5400 Boulevard Gouin Ouest
   - Distance: 4.1 km, ETA: 15 min
   - Rating: 4.2/5

5. **Hôpital Maisonneuve-Rosemont**
   - Address: 5415 Boulevard de l'Assomption
   - Distance: 3.2 km, ETA: 14 min
   - Rating: 4.1/5

#### Urgent Care (2)
1. **Hôpital Saint-Luc**
   - Address: 1058 Rue Saint-Denis
   - Distance: 1.2 km, ETA: 7 min
   - Rating: 4.0/5

2. **Hôpital Général de Montréal**
   - Address: 1650 Cedar Avenue
   - Distance: 0.9 km, ETA: 5 min
   - Rating: 4.2/5

#### Clinics (2)
1. **McGill Clinic - Downtown**
   - Address: 3655 Drummond Street
   - Distance: 0.8 km, ETA: 5 min
   - Rating: 4.3/5

2. **Downtown Medical Clinic**
   - Address: 1000 Rue de la Gauchetière Ouest
   - Distance: 1.3 km, ETA: 8 min
   - Rating: 4.1/5

**Reference Point:** McGill University (45.5047, -73.5771)

---

## Customization Guide

### Add a New Facility

Edit `/app/api/recommend/route.ts`:

```typescript
const MOCK_FACILITIES: Facility[] = [
  // ... existing facilities ...
  {
    id: "new-facility-id",
    name: "Hospital Name",
    type: "emergency", // or "urgent_care", "clinic"
    address: "123 Medical Street, Montreal, QC H1A 1A1",
    lat: 45.5xxx,
    lng: -73.5xxx,
    hours: "24/7",
    services: ["Emergency", "Trauma", "Surgery"],
    phone: "(514) 123-4567",
    website: "https://...",
    estimated_wait_minutes: 25,
  },
];
```

### Change Scoring Weights

Edit the scoring formula in `/app/api/recommend/route.ts`:

```typescript
// Adjust these weights (must sum to 1.0)
score += etaScore * 0.4;           // Distance/ETA weight
score += waitScore * 0.3;          // Wait time weight
score += typeMatchScore * 0.2;     // Facility type match
score += severityMatchScore * 0.1; // Severity appropriateness
```

### Add Red Flag Symptoms

Edit `/app/api/triage/route.ts`:

```typescript
const CRITICAL_RED_FLAGS = [
  "chest pain",
  "shortness of breath",
  "difficulty breathing",
  // Add more symptoms here
  "new_symptom",
];
```

### Change Default Location

Edit `/app/emergency-map/page.tsx`:

```typescript
const MCGILL_LOCATION = {
  name: "Your Location Name",
  lat: 45.5xxx,
  lng: -73.5xxx,
};
```

---

## Deployment

### Vercel (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Emergency Router v1.0"
git push origin main

# 2. Go to vercel.com and import repository
# 3. Configure environment variables (if any)
# 4. Deploy

# Your app will be live at: https://your-app.vercel.app
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t emergency-router .
docker run -p 3000:3000 emergency-router
```

### Environment Variables

Create `.env.local`:

```
# Optional: for future integrations
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
HOSPITAL_API_KEY=your_key_here
```

---

## Testing

### Unit Test Cases

```typescript
// Test critical case
const criticalResult = triageSymptoms({
  symptoms: "chest pain and shortness of breath",
  severity_self_report: 4,
});
assert(criticalResult.severity === 5);
assert(criticalResult.should_call_911 === true);

// Test moderate case
const moderateResult = triageSymptoms({
  symptoms: "fever and body aches",
});
assert(moderateResult.severity === 3);
assert(moderateResult.facility_type === "urgent_care");

// Test recommendation scoring
const recommended = await scoreFacilities({
  user_lat: 45.5047,
  user_lng: -73.5771,
  severity: 5,
  facility_type_needed: "emergency",
});
assert(recommended[0].name === "Royal Victoria Hospital");
assert(recommended[0].distance_miles < 1);
```

### Manual Testing Scenarios

**Scenario 1: Critical Emergency**
- Go to `/emergency-router`
- Enter: "I can't breathe and my chest hurts"
- Set severity to 5
- Expected: Red banner, "Call 911" message, nearest ER recommended

**Scenario 2: Browse Facilities**
- Go to `/emergency-map`
- Select "Emergency Rooms" filter
- Verify all 5 ERs appear
- Click each to verify details

**Scenario 3: Voice Input**
- Go to `/emergency-router`
- Click microphone icon
- Say: "I have a fever"
- Verify text is transcribed

---

## Troubleshooting

### Issue: Port 3001 already in use
```bash
# Kill process using port
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

### Issue: API returning 400 error
- Check request body has all required fields
- Verify lat/lng are numbers (not strings)
- Ensure severity is between 1-5

### Issue: Map not loading
- Clear browser cache (Cmd+Shift+Delete)
- Check if Leaflet CDN is accessible
- Verify coordinates are valid (45.X, -73.X)

### Issue: Voice not working
- Check microphone permissions
- Verify browser supports Web Speech API
- Try in Chrome or Firefox
- Check console for permission errors

---

## Performance Optimization

### Frontend
- Uses Next.js Turbopack for fast dev builds
- Tailwind CSS for optimized styling
- Lazy loading components
- Dark mode support

### Backend
- In-memory caching for facility searches
- Efficient Haversine distance calculation
- Weighted scoring algorithm
- Minimal API round trips

### Future Improvements
- CDN for static assets
- Database caching layer
- Real-time facility status updates
- GraphQL API option

---

## Security Considerations

### Current Implementation
- ✅ No authentication required (public health tool)
- ✅ No user data stored
- ✅ All processing client-side
- ✅ CORS headers configured
- ⚠️ Disclaimers on every page

### Production Hardening
- Add rate limiting
- Implement API key validation
- Enable HTTPS
- Add logging/monitoring
- HIPAA compliance review

---

## Future Enhancements

### Phase 2 (Next Sprint)
- [ ] Real Google Maps integration
- [ ] Hospital wait time APIs
- [ ] Insurance provider filtering
- [ ] Specialist availability

### Phase 3 (Future)
- [ ] Mobile native apps
- [ ] Advanced AI triage (GPT-4)
- [ ] Integration with 911 dispatch
- [ ] Multi-language support
- [ ] International expansion

---

## Support & Contact

For issues or questions:

1. Check troubleshooting section above
2. Review code comments (well-documented)
3. Check README files:
   - `EMERGENCY_ROUTER_README.md` - Feature overview
   - `MCP_INTEGRATION_GUIDE.md` - Technical integration

---

## License

This project is for hackathon purposes. Modify freely for your use case.

**Important:** Always include medical disclaimers when deploying. This tool does NOT provide medical advice.

---

## Quick Links

| Link | Purpose |
|------|---------|
| http://localhost:3001 | Homepage |
| http://localhost:3001/emergency-router | Symptom input & triage |
| http://localhost:3001/emergency-map | Facilities map |
| http://localhost:3001/api/triage | Triage API endpoint |
| http://localhost:3001/api/recommend | Recommend API endpoint |

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** Production Ready for Hackathon ✅

Good luck with your hackathon! 🚀
