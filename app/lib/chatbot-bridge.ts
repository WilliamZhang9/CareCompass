/**
 * Chatbot Integration Utility
 * Handles communication between Athena chatbot widget and our triage system
 */

export interface ChatbotMessage {
  score?: number;
  symptoms?: string;
  urgency?: string;
  timestamp?: number;
}

class ChatbotBridge {
  private listeners: ((message: ChatbotMessage) => void)[] = [];

  constructor() {
    this.setupMessageListener();
    this.injectChatbotWidget();
  }

  private setupMessageListener() {
    // Listen for messages from the chatbot widget
    window.addEventListener('message', (event: MessageEvent) => {
      // Only process messages from trusted sources
      try {
        const data = event.data;
        
        // Handle different message types from Athena chatbot
        if (data && typeof data === 'object') {
          // The widget might send score, symptoms, or urgency data
          const message: ChatbotMessage = {
            timestamp: Date.now(),
            ...data,
          };
          
          this.notifyListeners(message);
        }
      } catch (error) {
        console.error('Error processing chatbot message:', error);
      }
    });
  }

  private injectChatbotWidget() {
    if (document.getElementById('athena-chatbot-injected')) {
      return; // Already injected
    }

    const script = document.createElement('script');
    script.id = 'athena-chatbot-injected';
    script.src = 'https://athenachat.bot/chatbot/widget/carecompass4577';
    script.async = true;
    
    script.onload = () => {
      console.log('Athena chatbot widget loaded');
      this.configureWidget();
    };
    
    script.onerror = () => {
      console.error('Failed to load Athena chatbot widget');
    };

    document.head.appendChild(script);
  }

  private configureWidget() {
    // Configure the chatbot widget if available
    if ((window as any).AthenaChat) {
      (window as any).AthenaChat.configure?.({
        onScore: (score: number) => {
          this.notifyListeners({ score });
        },
        onComplete: (data: any) => {
          // When the AI assessment is complete
          if (data.score) {
            this.notifyListeners({
              score: data.score,
              symptoms: data.symptoms,
              urgency: data.urgency,
            });
          }
        },
      });
    }
  }

  public subscribe(callback: (message: ChatbotMessage) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(message: ChatbotMessage) {
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in chatbot listener:', error);
      }
    });
  }

  public extractScoreFromMessage(message: string): number | null {
    // Try to extract a score from the message
    // Look for patterns like "score: 4" or "4/5" or "urgency: 4"
    const patterns = [
      /score:\s*(\d)/i,
      /(\d)\/5/,
      /urgency:\s*(\d)/i,
      /severity:\s*(\d)/i,
      /level:\s*(\d)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const score = parseInt(match[1]);
        if (score >= 1 && score <= 5) {
          return score;
        }
      }
    }

    return null;
  }
}

// Create singleton instance
let instance: ChatbotBridge | null = null;

export function initChatbotBridge(): ChatbotBridge {
  if (!instance) {
    instance = new ChatbotBridge();
  }
  return instance;
}

export function getChatbotBridge(): ChatbotBridge {
  if (!instance) {
    instance = new ChatbotBridge();
  }
  return instance;
}

// Global type extensions
declare global {
  interface Window {
    AthenaChat?: {
      configure?: (config: any) => void;
      sendMessage?: (message: string) => void;
      on?: (event: string, callback: Function) => void;
    };
    __chatbotBridge?: ChatbotBridge;
  }
}

// Export for use in components
export default ChatbotBridge;
