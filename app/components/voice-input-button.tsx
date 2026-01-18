"use client";

import React, { useState, useEffect } from "react";
import { voiceInput } from "@/app/lib/voice";

interface VoiceInputComponentProps {
  onTranscript: (text: string) => void;
  isListening?: boolean;
}

export function VoiceInputButton({ onTranscript, isListening }: VoiceInputComponentProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(voiceInput.isSupported());
  }, []);

  const handleStartListening = () => {
    if (!supported) {
      setError("Voice input not supported in this browser");
      return;
    }

    setListening(true);
    setTranscript("");
    setError(null);

    voiceInput.listen(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          setListening(false);
          onTranscript(text);
        }
      },
      (err) => {
        setError(err);
        setListening(false);
      }
    );
  };

  const handleStopListening = () => {
    voiceInput.stopListening();
    setListening(false);
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={listening ? handleStopListening : handleStartListening}
        className={`w-full px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
          listening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {listening ? (
          <>
            <span className="animate-pulse">🎤 Stop Recording</span>
          </>
        ) : (
          <>
            <span>🎤 Voice Input</span>
          </>
        )}
      </button>

      {transcript && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
            Transcribed:
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {transcript}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
