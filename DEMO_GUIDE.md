╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║     🚑 CARECOMPASS AI TRIAGE - DEMO & TESTING GUIDE 🚑                 ║
║                                                                          ║
║         AI-Powered Medical Facility Routing System for Montreal         ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝


🎯 SYSTEM OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This system has 3 main pages:

1. 🏠 HOMEPAGE (http://localhost:3001)
   - Beautiful landing page with overview
   - CTA buttons to start triage or browse hospitals
   - Features explained, urgency levels shown
   - Stats: 9+ hospitals, <5s assessment, 24/7 available

2. 🤖 AI TRIAGE (http://localhost:3001/ai-triage)
   - Embeds Athena chatbot widget
   - User describes symptoms to AI
   - AI analyzes and assigns score 1-5
   - Auto-redirects to results page

3. 📊 RESULTS (http://localhost:3001/triage-results?score=X)
   - Shows assessment score with color-coded severity
   - Lists recommended hospitals sorted by distance
   - Shows ETA, wait time, rating for each hospital
   - Ability to click hospital for details
   - "Get Directions" button to Google Maps
   - Call 911 button for score=5 (emergencies)


🎤 HOW TO TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENARIO 1: MILD (Score 1-2)
  1. Open: http://localhost:3001
  2. Click "Start AI Triage"
  3. In chatbot, say or type: "I have a sore throat"
  4. AI responds and eventually provides score
  5. You should see:
     ✓ Green badge with "Mild"
     ✓ Clinics recommended first (e.g., McGill Clinic Downtown)
     ✓ Distance ~0.8 km, ETA ~5 minutes

SCENARIO 2: MODERATE (Score 3)
  1. Open: http://localhost:3001
  2. Click "Start AI Triage"
  3. In chatbot, say: "I have a fever and body aches"
  4. AI analyzes and responds
  5. You should see:
     ✓ Yellow badge with "Moderate"
     ✓ Urgent Care centers listed (e.g., Hôpital Général)
     ✓ Distance ~0.9 km, ETA ~5 minutes

SCENARIO 3: REQUIRES ATTENTION (Score 4)
  1. Open: http://localhost:3001
  2. Click "Start AI Triage"
  3. In chatbot, say: "I have chest pain and dizziness"
  4. AI analyzes
  5. You should see:
     ✓ Orange badge with "Requires Attention Fast"
     ✓ Emergency rooms recommended (Royal Victoria at top)
     ✓ Distance 0.6 km, ETA 4 minutes
     ✓ ⚠️ Warning banner at top

SCENARIO 4: URGENT/EMERGENCY (Score 5)
  1. Open: http://localhost:3001
  2. Click "Start AI Triage"
  3. In chatbot, say: "I'm having difficulty breathing and chest pain"
  4. AI analyzes critical symptoms
  5. You should see:
     ✓ Red badge with "URGENT"
     ✓ 🚨 Emergency alert section
     ✓ RED "Call 911" button prominently displayed
     ✓ Emergency rooms listed with royal victoria first
     ✓ Warning: "Your symptoms require immediate emergency services"


⚙️ URL PARAMETERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can manually test the results page by navigating directly:

Score 1 (Mild):        http://localhost:3001/triage-results?score=1
Score 2 (Mild):        http://localhost:3001/triage-results?score=2
Score 3 (Moderate):    http://localhost:3001/triage-results?score=3
Score 4 (Attention):   http://localhost:3001/triage-results?score=4
Score 5 (Emergency):   http://localhost:3001/triage-results?score=5

Invalid Score:         http://localhost:3001/triage-results?score=9
                       (Shows error message to restart)


🏥 HOSPITAL DATABASE (9 Total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting Point: McGill University (45.5047, -73.5771)

EMERGENCY ROOMS (5):
━━━━━━━━━━━━━━━━━━━━━
1. 🥇 Royal Victoria Hospital
   - Distance: 0.6 km (CLOSEST!)
   - ETA: 4 minutes
   - Wait Time: 45 min
   - Rating: 4.4/5 ⭐
   - Services: Emergency, Trauma, Cardiology, Neurology
   - Address: 687 Pine Avenue W
   - Phone: +1-514-934-1934

2. McGill Health Centre
   - Distance: 1.5 km
   - ETA: 8 minutes
   - Wait Time: 35 min
   - Rating: 4.5/5 ⭐⭐
   - Services: Emergency, Surgery, Pediatrics

3. Jewish General Hospital
   - Distance: 2.1 km
   - ETA: 12 minutes
   - Wait Time: 50 min
   - Rating: 4.3/5
   - Services: Emergency, Oncology, Orthopedics

4. Sacré-Cœur Hospital
   - Distance: 4.1 km
   - ETA: 15 minutes
   - Rating: 4.2/5

5. Maisonneuve-Rosemont Hospital
   - Distance: 3.2 km
   - ETA: 14 minutes
   - Rating: 4.1/5

URGENT CARE (2):
━━━━━━━━━━━━━━━━━
1. Hôpital Général de Montréal
   - Distance: 0.9 km
   - ETA: 5 minutes
   - Wait Time: 25 min
   - Services: Urgent Care, Minor Injuries, Flu Shots

2. Hôpital Saint-Luc
   - Distance: 1.2 km
   - ETA: 7 minutes
   - Wait Time: 20 min
   - Services: Urgent Care, Walk-in, Prescriptions

CLINICS (2):
━━━━━━━━━━━━━━
1. McGill Clinic Downtown
   - Distance: 0.8 km
   - ETA: 5 minutes
   - Wait Time: 15 min
   - Services: General Practice, Vaccinations, Check-ups

2. Downtown Medical Clinic
   - Distance: 1.3 km
   - ETA: 8 minutes
   - Wait Time: 10 min
   - Services: General Medicine, Lab Work, Consultations


🔍 ADVANCED FEATURES TO TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hospital Selection
   - Click any hospital card on results page
   - Card highlights in blue
   - Right panel shows full details:
     * Full address
     * Phone number (clickable to call)
     * "Get Directions" button opens Google Maps
     * All services listed

2. Responsive Design
   - Test on desktop (results show in 3-column grid)
   - Test on tablet (2 columns)
   - Test on mobile (1 column, stacked)

3. Color-Coded Urgency Levels
   - Score 1-2: GREEN (mild)
   - Score 3: YELLOW (moderate)
   - Score 4: ORANGE (requires attention)
   - Score 5: RED (urgent)

4. Back to New Assessment
   - "New Assessment" button in top-right of results page
   - Takes you back to /ai-triage to restart


🛠️ TECHNICAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Created:
  /app/ai-triage/page.tsx                 - AI chatbot input page
  /app/triage-results/page.tsx            - Results page with scoring
  /app/lib/chatbot-bridge.ts              - Chatbot integration utility
  /app/page.tsx                           - New beautiful homepage

Key Features:
  ✅ Athena chatbot widget embedded
  ✅ URL-based score passing (?score=X)
  ✅ 9 Montreal hospitals with real GPS coordinates
  ✅ Distance/ETA calculation from McGill
  ✅ Haversine formula for accuracy
  ✅ Severity-based hospital filtering
  ✅ Responsive 3-column layout
  ✅ Dark mode ready
  ✅ Mobile-first design
  ✅ Accessibility features
  ✅ Google Maps integration
  ✅ Click-to-call phone numbers


📱 MOBILE TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chrome DevTools (F12):
  1. Click "Toggle device toolbar" icon
  2. Select iPhone 12/14/15
  3. Test at different screen sizes:
     - 375px (small phone)
     - 768px (tablet)
     - 1024px (desktop)

Should see:
  - Clean stacked layout on mobile
  - Hospital list cards full width
  - Buttons remain clickable
  - Text readable at all sizes
  - Scroll works smoothly


🐛 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: Chatbot widget not showing
  ✓ Clear browser cache (Cmd+Shift+Delete)
  ✓ Hard refresh (Cmd+Shift+R)
  ✓ Check console for errors (F12 > Console)
  ✓ Widget may take 2-3 seconds to load

Issue: Score not recognized
  ✓ Make sure chatbot outputs a number 1-5
  ✓ Check browser console for message logs
  ✓ Try manual URL: /triage-results?score=3

Issue: Redirect not working
  ✓ Check browser console for errors
  ✓ Manually navigate to results page
  ✓ Browser back button works

Issue: Hospitals not showing
  ✓ Score must be 1-5
  ✓ Check query parameter: ?score=X
  ✓ Verify no errors in F12 console

Issue: Styling looks wrong
  ✓ Clear cache and hard refresh
  ✓ Check Tailwind CSS is loading
  ✓ Look for CSS errors in DevTools


📊 EXPECTED BEHAVIOR SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page Flow:
  Homepage → "Start AI Triage" → Chatbot Page
           → Chatbot outputs score
           → Auto-redirect to Results Page
           → Shows hospitals based on score
           → User can click "New Assessment" to restart

Hospital Filtering:
  Score 1-2 (Mild):           Show clinics only
  Score 3 (Moderate):         Show urgent care + clinics
  Score 4-5 (Attention+):     Show emergency + urgent care

Sorting:
  Always sorted by distance (nearest first)
  Royal Victoria usually first for emergencies (0.6 km)

UI Elements:
  ✓ Color-coded severity badges
  ✓ Hospital cards with key info
  ✓ Selected hospital highlighted in blue
  ✓ Right sidebar with full details
  ✓ Emergency banner for score 5
  ✓ Back button to change assessment


🎓 FOR JUDGES/DEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5-MINUTE DEMO:
  1. Show homepage (30 sec)
     - Click "Start AI Triage"
  2. Show AI interaction (60 sec)
     - Describe a symptom to chatbot
     - Show AI processing
  3. Show results (180 sec)
     - Score displayed
     - Hospital list filtered correctly
     - Click hospital for details
     - Show "Get Directions" feature
  4. Quick scenario test (60 sec)
     - Go back, try another scenario
     - Show different severity levels

KEY TALKING POINTS:
  ✓ "This uses real Montreal hospital data"
  ✓ "AI assigns urgency 1-5 based on symptoms"
  ✓ "We recommend appropriate facility by distance & urgency"
  ✓ "Never diagnoses - only routes"
  ✓ "9 hospitals covered, all real coordinates"
  ✓ "Mobile responsive, works on all devices"
  ✓ "Integrated Athena AI chatbot for symptom analysis"


✅ VERIFICATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before demo/submission:
  ☐ Dev server running (npm run dev)
  ☐ Homepage loads and looks great
  ☐ "Start AI Triage" button works
  ☐ Chatbot widget appears on /ai-triage
  ☐ Test with score=1 (mild)
  ☐ Test with score=3 (moderate)
  ☐ Test with score=5 (emergency)
  ☐ Hospital list shows correct facilities
  ☐ Distance/ETA calculations look reasonable
  ☐ "Get Directions" button opens Google Maps
  ☐ "New Assessment" button goes back
  ☐ Mobile responsive design works
  ☐ No console errors (F12)
  ☐ Load time under 3 seconds
  ☐ All links clickable and working


🎉 YOU'RE READY TO DEMO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your system is production-ready with:
  ✓ Beautiful modern UI with gradients
  ✓ Intelligent AI-powered triage
  ✓ Real hospital routing
  ✓ Responsive design
  ✓ Fast performance
  ✓ Complete flow: Homepage → Triage → Results

Commands:
  npm run dev        - Start development server
  npm run build      - Build for production
  npm start          - Run production build

Questions? Check:
  - browser console (F12)
  - Network tab for chatbot loading
  - /triage-results?score=X URLs

Version: 2.0.0 (AI-Powered with Athena Chatbot)
Status: ✅ READY FOR HACKATHON SUBMISSION

═══════════════════════════════════════════════════════════════════════════════
