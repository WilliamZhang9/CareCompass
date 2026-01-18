'''
/app
├── api/
│   ├── triage/
│   │   └── route.ts                    ← Symptom analysis API
│   └── recommend/
│       └── route.ts                    ← Facility recommendation API
│
├── emergency-router/
│   └── page.tsx                        ← Main triage UI (input symptoms)
│
├── emergency-map/
│   └── page.tsx                        ← Facilities map (browse hospitals)
│
├── components/
│   └── voice-input-button.tsx          ← Voice input component
│
├── lib/
│   └── voice.ts                        ← Voice utilities (input/output)
│
├── mcp/
│   ├── index.ts                        ← FastFood map MCP server
│   └── emergency-router-mcp.ts         ← Emergency Router MCP server
│
├── hooks/                              ← Custom React hooks
├── page.tsx                            ← Homepage (navigation)
└── layout.tsx                          ← Root layout

/public
├── emergency-map-widget.html           ← Leaflet map widget
└── map-widget.html                     ← FastFood map widget
'''
