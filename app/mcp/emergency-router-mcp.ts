import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.EMERGENCY_ROUTER_PORT || 3001;

// Montreal hospitals and medical facilities
const MONTREAL_HOSPITALS = [
  {
    id: "mcgill-emergency",
    name: "McGill University Health Centre (MUHC)",
    type: "emergency",
    address: "1001 Boulevard Décarie, Montreal, QC H4A 3J1",
    lat: 45.4909,
    lng: -73.6089,
    rating: "4.5",
    phone: "(514) 934-1934",
    services: ["Emergency", "Trauma", "Cardiology", "Orthopedics"],
    hours: "24/7",
  },
  {
    id: "royal-vic",
    name: "Royal Victoria Hospital",
    type: "emergency",
    address: "687 Avenue des Pins Ouest, Montreal, QC H3A 1A1",
    lat: 45.5017,
    lng: -73.5793,
    rating: "4.4",
    phone: "(514) 842-1231",
    services: ["Emergency", "Trauma", "ICU", "Surgery"],
    hours: "24/7",
  },
  {
    id: "jewish-general",
    name: "Jewish General Hospital",
    type: "emergency",
    address: "3755 Côte-Sainte-Catherine, Montreal, QC H3T 1E2",
    lat: 45.5189,
    lng: -73.6022,
    rating: "4.3",
    phone: "(514) 340-8222",
    services: ["Emergency", "Cardiology", "Oncology", "Pediatrics"],
    hours: "24/7",
  },
  {
    id: "sacre-coeur",
    name: "Hôpital du Sacré-Cœur de Montréal",
    type: "emergency",
    address: "5400 Boulevard Gouin Ouest, Montreal, QC H4J 1C5",
    lat: 45.5419,
    lng: -73.7397,
    rating: "4.2",
    phone: "(514) 338-2222",
    services: ["Emergency", "Cardiac", "Neurology", "Orthopedics"],
    hours: "24/7",
  },
  {
    id: "maisonneuve-rosemont",
    name: "Hôpital Maisonneuve-Rosemont",
    type: "emergency",
    address: "5415 Boulevard de l'Assomption, Montreal, QC H1T 2M4",
    lat: 45.527,
    lng: -73.5505,
    rating: "4.1",
    phone: "(514) 252-3400",
    services: ["Emergency", "Trauma", "Surgery", "Pediatrics"],
    hours: "24/7",
  },
  {
    id: "st-luc",
    name: "Hôpital Saint-Luc",
    type: "urgent_care",
    address: "1058 Rue Saint-Denis, Montreal, QC H2X 3J4",
    lat: 45.5123,
    lng: -73.5582,
    rating: "4.0",
    phone: "(514) 890-8000",
    services: ["Urgent Care", "Surgery", "Orthopedics"],
    hours: "24/7",
  },
  {
    id: "hopital-general",
    name: "Hôpital Général de Montréal",
    type: "urgent_care",
    address: "1650 Cedar Avenue, Montreal, QC H3G 1A4",
    lat: 45.5019,
    lng: -73.5779,
    rating: "4.2",
    phone: "(514) 934-1934",
    services: ["Urgent Care", "ICU", "Surgery"],
    hours: "24/7",
  },
  {
    id: "clinic-mcgill",
    name: "McGill Clinic - Downtown",
    type: "clinic",
    address: "3655 Drummond Street, Montreal, QC H3G 1Y1",
    lat: 45.4961,
    lng: -73.5803,
    rating: "4.3",
    phone: "(514) 289-0234",
    services: ["Primary Care", "Walk-in Clinic", "Minor Injuries"],
    hours: "9 AM - 9 PM",
  },
  {
    id: "clinic-downtown",
    name: "Downtown Medical Clinic",
    type: "clinic",
    address: "1000 Rue de la Gauchetière Ouest, Montreal, QC H3B 4W5",
    lat: 45.5025,
    lng: -73.5627,
    rating: "4.1",
    phone: "(514) 392-1234",
    services: ["Primary Care", "Urgent Care", "Walk-in"],
    hours: "8 AM - 10 PM",
  },
];

// McGill University location (starting point)
const McGILL_LOCATION = {
  name: "McGill University",
  lat: 45.5047,
  lng: -73.5771,
};

// In-memory cache
let lastSearchResults: any[] = [];

function loadWidgetHtml(filename: string): string {
  try {
    let widgetPath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(widgetPath)) {
      widgetPath = path.join(__dirname, "../public", filename);
    }
    return fs.readFileSync(widgetPath, "utf-8");
  } catch (error) {
    console.error(`Failed to load widget ${filename}:`, error);
    return `<!DOCTYPE html><html><body><p>Widget not found: ${filename}</p></body></html>`;
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
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

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "emergency-router-mcp-server",
    version: "1.0.0",
  });

  const mapWidgetHtml = loadWidgetHtml("emergency-map-widget.html");

  server.resource(
    "emergency-map-widget",
    "ui://widget/emergency-map.html",
    {
      description: "Interactive map widget showing emergency medical facilities",
      mimeType: "text/html",
    },
    async () => ({
      contents: [
        {
          uri: "ui://widget/emergency-map.html",
          mimeType: "text/html+skybridge",
          text: mapWidgetHtml,
          _meta: {
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    }),
  );

  // Tool to search for hospitals/medical facilities
  server.tool(
    "search_facilities",
    "Search for medical facilities in Montreal by type and location. Can search near McGill University or any other location.",
    {
      facility_type: z
        .enum(["emergency", "urgent_care", "clinic", "all"])
        .optional()
        .describe("Type of facility to search for"),
      lat: z
        .number()
        .optional()
        .describe(
          "Latitude of search center. Defaults to McGill University (45.5047)",
        ),
      lng: z
        .number()
        .optional()
        .describe(
          "Longitude of search center. Defaults to McGill University (-73.5771)",
        ),
      radius_km: z
        .number()
        .optional()
        .describe("Search radius in kilometers. Defaults to 5 km"),
      severity: z
        .enum(["critical", "high", "moderate", "low"])
        .optional()
        .describe(
          "Emergency severity level to filter appropriate facilities",
        ),
    },
    async ({ facility_type, lat, lng, radius_km, severity }) => {
      const centerLat = lat || McGILL_LOCATION.lat;
      const centerLng = lng || McGILL_LOCATION.lng;
      const radius = radius_km || 5;
      const typeFilter = facility_type || "all";
      const severityLevel = severity || "moderate";

      // Filter facilities
      let filtered = MONTREAL_HOSPITALS;

      // Filter by type
      if (typeFilter !== "all") {
        filtered = filtered.filter((f) => f.type === typeFilter);
      }

      // Filter by severity level
      if (severityLevel === "critical" || severityLevel === "high") {
        filtered = filtered.filter((f) => f.type === "emergency");
      } else if (severityLevel === "moderate") {
        filtered = filtered.filter(
          (f) => f.type === "emergency" || f.type === "urgent_care"
        );
      }

      // Calculate distances and sort
      const withDistance = filtered
        .map((facility) => ({
          ...facility,
          distance_km: parseFloat(
            calculateDistance(
              centerLat,
              centerLng,
              facility.lat,
              facility.lng
            ).toFixed(2)
          ),
          eta_minutes: Math.ceil(
            calculateDistance(
              centerLat,
              centerLng,
              facility.lat,
              facility.lng
            ) * 1.5
          ),
        }))
        .filter((f) => f.distance_km <= radius)
        .sort((a, b) => a.distance_km - b.distance_km);

      lastSearchResults = withDistance;

      if (withDistance.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No ${typeFilter !== "all" ? typeFilter : ""} medical facilities found within ${radius}km of your location.`,
            },
          ],
        };
      }

      const textSummary = withDistance
        .map(
          (f, i) =>
            `${i + 1}. ${f.name} (${f.type}) - ${f.distance_km}km away, ETA: ${f.eta_minutes} min - Rating: ${f.rating}/5`,
        )
        .join("\n");

      const centerPointLat =
        withDistance.reduce((sum, f) => sum + f.lat, 0) / withDistance.length;
      const centerPointLng =
        withDistance.reduce((sum, f) => sum + f.lng, 0) / withDistance.length;

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${withDistance.length} medical facilities in Montreal:\n\n${textSummary}`,
          },
        ],
        structuredContent: {
          facilities: withDistance,
          center: { lat: centerPointLat, lng: centerPointLng },
          userLocation: { lat: centerLat, lng: centerLng },
          location: "Montreal",
          severityLevel,
        },
        _meta: {
          "openai/outputTemplate": "ui://widget/emergency-map.html",
          "openai/widgetDomain": "*",
        },
      };
    },
  );

  // Tool to get facility details
  server.tool(
    "get_facility_details",
    "Get detailed information about a specific medical facility",
    {
      name: z
        .string()
        .describe("Name of the facility to get details for"),
    },
    async ({ name }) => {
      const facility = lastSearchResults.find((f) =>
        f.name.toLowerCase().includes(name.toLowerCase()),
      );

      if (!facility) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Facility "${name}" not found. Try searching first with search_facilities.`,
            },
          ],
        };
      }

      const details = `**${facility.name}**
Type: ${facility.type}
Address: ${facility.address}
Phone: ${facility.phone}
Hours: ${facility.hours}
Rating: ${facility.rating}/5
Distance: ${facility.distance_km}km
ETA: ${facility.eta_minutes} minutes

Services:
${facility.services.map((s: string) => `• ${s}`).join("\n")}`;

      return {
        content: [
          {
            type: "text" as const,
            text: details,
          },
        ],
        structuredContent: {
          facility,
        },
      };
    },
  );

  // Tool to find nearest emergency
  server.tool(
    "find_nearest_emergency",
    "Quickly find the nearest emergency room from your current location",
    {
      lat: z
        .number()
        .optional()
        .describe("Your current latitude. Defaults to McGill University"),
      lng: z
        .number()
        .optional()
        .describe("Your current longitude. Defaults to McGill University"),
    },
    async ({ lat, lng }) => {
      const centerLat = lat || McGILL_LOCATION.lat;
      const centerLng = lng || McGILL_LOCATION.lng;

      const emergencies = MONTREAL_HOSPITALS.filter(
        (f) => f.type === "emergency"
      )
        .map((facility) => ({
          ...facility,
          distance_km: calculateDistance(
            centerLat,
            centerLng,
            facility.lat,
            facility.lng
          ),
          eta_minutes: Math.ceil(
            calculateDistance(
              centerLat,
              centerLng,
              facility.lat,
              facility.lng
            ) * 1.5
          ),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

      if (emergencies.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No emergency rooms found. Call 911 immediately.",
            },
          ],
        };
      }

      const nearest = emergencies[0];
      lastSearchResults = emergencies;

      return {
        content: [
          {
            type: "text" as const,
            text: `🚑 NEAREST EMERGENCY: ${nearest.name}
Distance: ${nearest.distance_km.toFixed(2)}km
ETA: ${nearest.eta_minutes} minutes
Phone: ${nearest.phone}
Address: ${nearest.address}`,
          },
        ],
        structuredContent: {
          nearestEmergency: nearest,
          allEmergencies: emergencies,
          center: { lat: centerLat, lng: centerLng },
        },
        _meta: {
          "openai/outputTemplate": "ui://widget/emergency-map.html",
          "openai/widgetDomain": "*",
        },
      };
    },
  );

  return server;
}

// Express app
const app = express();
const transports = new Map<string, StreamableHTTPServerTransport>();

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Mcp-Session-Id",
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", server: "emergency-router-mcp-server" });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "emergency-router-mcp-server",
    version: "1.0.0",
    description: "MCP server for emergency medical facility routing",
    endpoints: {
      mcp: "/mcp",
      health: "/health",
    },
    tools: [
      "search_facilities",
      "get_facility_details",
      "find_nearest_emergency",
    ],
    location: "Montreal, Canada",
    coverage: "McGill University area and surrounding",
  });
});

app.all("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (req.method === "GET") {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    res
      .status(400)
      .json({ error: "Missing Mcp-Session-Id header for GET request" });
    return;
  }

  if (req.method === "POST") {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        console.log(`Session initialized: ${newSessionId}`);
        transports.set(newSessionId, transport);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && transports.has(sid)) {
        console.log(`Session closed: ${sid}`);
        transports.delete(sid);
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  if (req.method === "DELETE") {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
      res.status(200).json({ message: "Session terminated" });
      return;
    }
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(
      `🏥 Emergency Router MCP Server running on http://localhost:${PORT}`,
    );
    console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Coverage: Montreal, Canada`);
    console.log(`   Starting point: McGill University`);
    console.log("");
  });
}

export default app;

process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  for (const [sessionId, transport] of transports) {
    console.log(`Closing session: ${sessionId}`);
    transport.close();
  }
  process.exit(0);
});
