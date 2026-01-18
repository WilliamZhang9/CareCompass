/**
 * Voice utilities for the Emergency Router
 * Uses Web Speech API for voice input/output (free MVP alternative)
 * Can be upgraded to ElevenLabs later
 */

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    speechSynthesis: SpeechSynthesis;
  }
}

export class VoiceInput {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.language = "en-US";
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  listen(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError("Speech recognition not supported");
      return;
    }

    this.isListening = true;

    this.recognition.onstart = () => {
      // Recording started
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const isFinal = event.results[event.results.length - 1].isFinal;
      onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (error) {
      onError("Failed to start listening");
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
}

export class VoiceOutput {
  speak(text: string, onComplete?: () => void): void {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (onComplete) {
        utterance.onend = onComplete;
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  stopSpeaking(): void {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  isSupported(): boolean {
    return "speechSynthesis" in window;
  }
}

export const voiceInput = new VoiceInput();
export const voiceOutput = new VoiceOutput();
