/**
 * ElevenLabs Voice Integration
 * Text-to-speech for medical information
 */

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export class ElevenLabsVoice {
  private apiKey: string;
  private voiceId: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey?: string, voiceId?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
    this.voiceId = voiceId || process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '';
    
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured');
    }
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(options: TextToSpeechOptions): Promise<Blob | null> {
    try {
      const voiceId = options.voiceId || this.voiceId;
      const modelId = options.modelId || 'eleven_monolingual_v1';

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: options.text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return null;
    }
  }

  /**
   * Play text as speech
   */
  async speak(text: string): Promise<void> {
    try {
      const audioBlob = await this.textToSpeech({ text });
      if (!audioBlob) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

      // Clean up
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error playing speech:', error);
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }
}

// Export singleton instance
export const elevenLabsVoice = new ElevenLabsVoice();
