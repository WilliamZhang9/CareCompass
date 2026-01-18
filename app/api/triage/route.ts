import { z } from "zod";

// Triage schema - captures user's symptoms and context
const TriageInputSchema = z.object({
  symptoms: z.string().describe("User's symptoms in natural language"),
  severity_self_report: z.number().min(1).max(5).optional().describe("User's self-reported severity (1=mild, 5=critical)"),
  age: z.number().min(0).max(150).optional(),
  hasComorbidities: z.boolean().optional().default(false),
  isPregnant: z.boolean().optional().default(false),
  recentTrauma: z.boolean().optional().default(false),
});

type TriageInput = z.infer<typeof TriageInputSchema>;

// Red flags that indicate emergency (911)
const CRITICAL_RED_FLAGS = [
  "chest pain",
  "shortness of breath",
  "difficulty breathing",
  "unconscious",
  "unresponsive",
  "severe bleeding",
  "difficulty speaking",
  "facial drooping",
  "arm weakness",
  "leg weakness",
  "loss of consciousness",
  "severe allergic reaction",
  "poisoning",
  "overdose",
];

interface TriageResult {
  severity: 1 | 2 | 3 | 4 | 5;
  facility_type: "emergency" | "urgent_care" | "clinic";
  red_flags: string[];
  reasoning: string;
  recommendation: string;
  should_call_911: boolean;
}

/**
 * Simple, explainable triage logic
 * This can be enhanced with an LLM later, but for MVP:
 * Use rule-based + keyword detection
 */
function triageSymptoms(input: TriageInput): TriageResult {
  const symptomsLower = input.symptoms.toLowerCase();
  const detectedRedFlags = CRITICAL_RED_FLAGS.filter((flag) =>
    symptomsLower.includes(flag)
  );

  // Keywords to identify if symptoms are health-related
  const healthRelatedKeywords = [
    'pain', 'fever', 'cough', 'headache', 'nausea', 'fatigue',
    'severe', 'bleeding', 'chest', 'breath', 'dizzy', 'vomiting',
    'seizure', 'stroke', 'trauma', 'injury', 'illness', 'sick',
    'symptom', 'disease', 'medical', 'health', 'hurt', 'ache'
  ];

  const isHealthRelated = healthRelatedKeywords.some(keyword => 
    symptomsLower.includes(keyword)
  );

  let baseSeverity: 1 | 2 | 3 | 4 | 5 = isHealthRelated ? (input.severity_self_report || 2) : 1;
  let facilityType: "emergency" | "urgent_care" | "clinic" = "clinic";
  let reasoning: string[] = [];

  // If not health-related, return minimal urgency
  if (!isHealthRelated) {
    return {
      severity: 1,
      facility_type: "clinic",
      red_flags: [],
      reasoning: "Input does not appear to be related to a medical concern",
      recommendation: "Please describe a health-related concern for proper guidance",
      should_call_911: false,
    };
  }

  // Rule 1: Critical red flags → Emergency + 911
  if (detectedRedFlags.length > 0) {
    baseSeverity = 5;
    facilityType = "emergency";
    reasoning.push(
      `Critical symptoms detected: ${detectedRedFlags.join(", ")}`
    );
  }

  // Rule 2: High self-reported severity
  if (input.severity_self_report && input.severity_self_report >= 4) {
    if (baseSeverity < 4) baseSeverity = 4;
    facilityType = "emergency";
    reasoning.push("User reports high severity");
  }

  // Rule 3: Moderate symptoms
  if (baseSeverity === 3) {
    facilityType = "urgent_care";
    reasoning.push("Moderate symptoms warrant urgent evaluation");
  }

  // Rule 4: Risk factors elevate severity
  if (input.hasComorbidities && baseSeverity < 4) {
    baseSeverity = Math.min(4, baseSeverity + 1);
    reasoning.push("Existing medical conditions increase risk");
  }

  if (input.isPregnant && baseSeverity < 4) {
    baseSeverity = Math.min(4, baseSeverity + 1);
    facilityType = "emergency";
    reasoning.push("Pregnancy-related symptoms need emergency evaluation");
  }

  if (input.recentTrauma && baseSeverity < 3) {
    baseSeverity = 3;
    facilityType = "urgent_care";
    reasoning.push("Recent trauma requires medical assessment");
  }

  const recommendation =
    baseSeverity === 5
      ? "EMERGENCY: Call 911 immediately or go to nearest ER"
      : baseSeverity >= 4
        ? "Go to nearest Emergency Room (non-critical)"
        : baseSeverity === 3
          ? "Visit an Urgent Care clinic today"
          : "Schedule appointment at primary care clinic";

  return {
    severity: baseSeverity as 1 | 2 | 3 | 4 | 5,
    facility_type: facilityType,
    red_flags: detectedRedFlags,
    reasoning: reasoning.join(". "),
    recommendation,
    should_call_911: baseSeverity === 5,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = TriageInputSchema.parse(body);

    const result = triageSymptoms(input);

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Triage failed";
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
