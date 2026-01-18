"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { VoiceInputButton } from "@/app/components/voice-input-button";
import { useTTS } from "@/app/lib/hooks/useTTS";
import type { SpeechPayload } from "@/app/lib/voice/types";

// Constants
const MCGILL_LOCATION = {
  name: "McGill University",
  lat: 45.5047,
  lng: -73.5771,
};

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
  distance_miles?: number;
  estimated_eta_minutes?: number;
  total_time_minutes?: number;
  score?: number;
  reasoning?: string[];
}

interface TriageResult {
  severity: 1 | 2 | 3 | 4 | 5;
  facility_type: "emergency" | "urgent_care" | "clinic";
  red_flags: string[];
  reasoning: string;
  recommendation: string;
  should_call_911: boolean;
}

interface RecommendationResult {
  recommended_facility: Facility;
  alternatives: Facility[];
  explanation: string;
  disclaimer: string;
}

const SEVERITY_COLORS = {
  1: "bg-green-100 text-green-900",
  2: "bg-blue-100 text-blue-900",
  3: "bg-yellow-100 text-yellow-900",
  4: "bg-orange-100 text-orange-900",
  5: "bg-red-100 text-red-900",
};

const SEVERITY_LABELS = {
  1: "Low",
  2: "Mild",
  3: "Moderate",
  4: "High",
  5: "Critical",
};

const FACILITY_TYPE_ICONS = {
  emergency: "🚑",
  urgent_care: "🏥",
  clinic: "⚕️",
};

export default function EmergencyRouter() {
  const [symptoms, setSymptoms] = useState("");
  const [severitySelf, setSeveritySelf] = useState(3);
  const [hasComorbidities, setHasComorbidities] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [recentTrauma, setRecentTrauma] = useState(false);
  const [age, setAge] = useState("");

  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [recommendationResult, setRecommendationResult] =
    useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { speak } = useTTS();

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to San Francisco if location denied
          setUserLocation({
            lat: 37.7749,
            lng: -122.4194,
          });
        }
      );
    }
  }, []);

  const handleTriage = async () => {
    if (!symptoms.trim()) {
      setError("Please describe your symptoms");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          severity_self_report: severitySelf,
          age: age ? parseInt(age) : undefined,
          hasComorbidities,
          isPregnant,
          recentTrauma,
        }),
      });

      if (!response.ok) throw new Error("Triage failed");

      const data = await response.json();
      setTriageResult(data.data);

      // Auto-recommend facilities
      if (userLocation) {
        await handleRecommendation(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendation = async (triage: TriageResult) => {
    if (!userLocation) {
      setError("Location access required for recommendations");
      return;
    }

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          severity: triage.severity,
          facility_type_needed: triage.facility_type,
        }),
      });

      if (!response.ok) throw new Error("Recommendation failed");

      const data = await response.json();
      setRecommendationResult(data.data);

      // Voice guidance using ElevenLabs TTS
      const facility = data.data.recommended_facility;
      const severityLevel = data.data.severity <= 2 ? "low" : data.data.severity <= 4 ? "moderate" : "high";
      
      const payload: SpeechPayload = {
        type: "caregiver_summary",
        locale: "en",
        voice: "calm",
        data: {
          severity: severityLevel,
          facilityName: facility.name,
          facilityType: facility.type,
          etaMin: facility.estimated_eta_minutes,
          address: facility.address,
        },
      };
      
      await speak(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleReset = () => {
    setSymptoms("");
    setSeveritySelf(3);
    setHasComorbidities(false);
    setIsPregnant(false);
    setRecentTrauma(false);
    setAge("");
    setTriageResult(null);
    setRecommendationResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Emergency Router
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Find the right medical facility for your situation
          </p>
        </div>

        {/* 911 Alert Banner */}
        {triageResult?.should_call_911 && (
          <div className="mb-6 bg-red-50 dark:bg-red-950 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚨</div>
              <div>
                <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
                  EMERGENCY
                </h2>
                <p className="text-red-800 dark:text-red-200 font-semibold text-lg">
                  {triageResult.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Describe Your Situation
              </h2>

              <div className="space-y-4">
                {/* Symptoms */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Symptoms
                  </label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g., 'chest pain and shortness of breath'"
                    className="w-full h-24 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                  />
                  
                  {/* Voice Input */}
                  <VoiceInputButton
                    onTranscript={(text) => setSymptoms(text)}
                    isListening={false}
                  />
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    How severe? ({severitySelf})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={severitySelf}
                    onChange={(e) => setSeveritySelf(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    1 = Mild | 5 = Critical
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Age (optional)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Your age"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Risk Factors */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Risk Factors
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasComorbidities}
                      onChange={(e) => setHasComorbidities(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Existing medical conditions
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isPregnant}
                      onChange={(e) => setIsPregnant(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Pregnant
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={recentTrauma}
                      onChange={(e) => setRecentTrauma(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Recent trauma/injury
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleTriage}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition"
                  >
                    {loading ? "Analyzing..." : "Get Help"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition"
                  >
                    Reset
                  </button>
                </div>

                {/* View Map Link */}
                <a
                  href="/emergency-map"
                  className="w-full block text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                >
                  🗺️ View Facilities Map
                </a>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {triageResult && (
              <>
                {/* Triage Result */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Assessment
                  </h2>

                  <div className={`p-4 rounded-lg mb-4 ${SEVERITY_COLORS[triageResult.severity]}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Severity Level</p>
                        <p className="text-2xl font-bold">
                          {SEVERITY_LABELS[triageResult.severity]}
                        </p>
                      </div>
                      <div className="text-4xl">
                        {triageResult.severity >= 4 ? "⚠️" : "ℹ️"}
                      </div>
                    </div>
                  </div>

                  {triageResult.red_flags.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Critical Symptoms Detected:
                      </p>
                      <ul className="list-disc list-inside text-red-800 dark:text-red-200">
                        {triageResult.red_flags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="font-semibold text-slate-900 dark:text-white mb-2">
                      Recommended Facility Type:
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-lg font-semibold">
                      <span className="text-2xl">
                        {FACILITY_TYPE_ICONS[triageResult.facility_type]}
                      </span>
                      <span>
                        {triageResult.facility_type === "emergency"
                          ? "Emergency Room"
                          : triageResult.facility_type === "urgent_care"
                            ? "Urgent Care"
                            : "Clinic"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Why:</span>{" "}
                      {triageResult.reasoning}
                    </p>
                  </div>
                </div>

                {/* Recommendation */}
                {recommendationResult && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                      Recommended Facility
                    </h2>

                    <FacilityCard
                      facility={recommendationResult.recommended_facility}
                      isRecommended
                    />

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">Why this choice:</span>{" "}
                        {recommendationResult.explanation}
                      </p>
                    </div>

                    {recommendationResult.alternatives.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                          Alternative Options
                        </h3>
                        <div className="space-y-3">
                          {recommendationResult.alternatives.map((facility) => (
                            <FacilityCard key={facility.id} facility={facility} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold mb-2">⚖️ Disclaimer</p>
                      <p>{recommendationResult.disclaimer}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {!triageResult && !loading && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🏥</div>
                <p className="text-slate-600 dark:text-slate-300 text-lg">
                  Describe your symptoms to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FacilityCardProps {
  facility: Facility;
  isRecommended?: boolean;
}

function FacilityCard({ facility, isRecommended }: FacilityCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isRecommended
          ? "border-green-500 bg-green-50 dark:bg-green-950"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">
              {FACILITY_TYPE_ICONS[facility.type]}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {facility.name}
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {facility.address}
          </p>
        </div>
        {isRecommended && (
          <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            Recommended
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        {facility.distance_miles && (
          <div>
            <p className="text-slate-500 dark:text-slate-400">Distance</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {facility.distance_miles} mi
            </p>
          </div>
        )}
        {facility.estimated_eta_minutes && (
          <div>
            <p className="text-slate-500 dark:text-slate-400">ETA</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {facility.estimated_eta_minutes} min
            </p>
          </div>
        )}
        {facility.estimated_wait_minutes && (
          <div>
            <p className="text-slate-500 dark:text-slate-400">Wait Time</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              ~{facility.estimated_wait_minutes} min
            </p>
          </div>
        )}
        {facility.score && (
          <div>
            <p className="text-slate-500 dark:text-slate-400">Match Score</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {facility.score}%
            </p>
          </div>
        )}
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
          Services:
        </p>
        <div className="flex flex-wrap gap-1">
          {facility.services.map((service) => (
            <span
              key={service}
              className="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded"
            >
              {service}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {facility.hours && (
          <span className="text-slate-600 dark:text-slate-400">
            {facility.hours}
          </span>
        )}
        {facility.phone && (
          <a
            href={`tel:${facility.phone}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            {facility.phone}
          </a>
        )}
      </div>

      {facility.reasoning && facility.reasoning.length > 0 && (
        <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-600 rounded text-xs text-slate-700 dark:text-slate-300">
          <p className="font-semibold">Why suitable:</p>
          <p>{facility.reasoning.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
