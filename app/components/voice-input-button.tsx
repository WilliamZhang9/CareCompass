"use client";

import React, { useState } from "react";
import { MicButton } from "./MicButton";

interface VoiceInputComponentProps {
  onTranscript: (text: string) => void;
  isListening?: boolean;
}

export function VoiceInputButton({ onTranscript }: VoiceInputComponentProps) {
  const [transcript, setTranscript] = useState("");

  const handleTranscript = (text: string) => {
    setTranscript(text);
    onTranscript(text);
  };

  return (
    <div className="space-y-2">
      <div className="w-full px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white">
        <MicButton
          onTranscript={handleTranscript}
          languageCode="eng"
        />
        <span>Voice Input</span>
      </div>

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
    </div>
  );
}
