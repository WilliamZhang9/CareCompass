'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AITriagePage() {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [messageReceived, setMessageReceived] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Hello! I\'m CareCompass AI. Please describe your symptoms or how you\'re feeling, and I\'ll help assess your medical urgency.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setLoading(true);

    // Simulate AI response with symptom analysis
    setTimeout(() => {
      const symptoms = userInput.toLowerCase();
      let score = 1;
      let urgency = 'Low';
      let response = '';

      // Basic symptom scoring
      const emergencyKeywords = ['chest pain', 'heart attack', 'stroke', 'seizure', 'unconscious', 'bleeding heavily', 'trouble breathing', 'severe'];
      const urgentKeywords = ['severe pain', 'high fever', 'vomiting', 'dizziness', 'shortness of breath', 'broken'];
      const moderateKeywords = ['pain', 'fever', 'cough', 'headache', 'nausea', 'fatigue'];

      if (emergencyKeywords.some(keyword => symptoms.includes(keyword))) {
        score = 5;
        urgency = 'Emergency';
        response = 'Based on your symptoms, this appears to be an emergency situation. You should seek immediate medical attention at an Emergency Room. Calling 911 is recommended.';
      } else if (urgentKeywords.some(keyword => symptoms.includes(keyword))) {
        score = 4;
        urgency = 'Requires Attention';
        response = 'Your symptoms suggest you need prompt medical attention. An Urgent Care facility or ER visit is recommended.';
      } else if (moderateKeywords.some(keyword => symptoms.includes(keyword))) {
        score = 3;
        urgency = 'Moderate';
        response = 'Your symptoms suggest moderate concern. An urgent care visit would be appropriate.';
      } else {
        score = 2;
        urgency = 'Mild';
        response = 'Based on what you\'ve described, this appears to be a minor concern. A clinic visit or home care may be sufficient.';
      }

      // Add AI response with score
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: response 
        }
      ]);

      setLoading(false);

      // Auto-trigger redirect
      setScore(score);
      setMessageReceived(true);
      setDisplayText(`Assessment Complete: ${urgency}`);

      setTimeout(() => {
        router.push(`/triage-results?score=${score}`);
      }, 2000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 9a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CareCompass AI Triage</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left - Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">How It Works</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Describe Symptoms</h3>
                    <p className="text-sm text-gray-600 mt-1">Tell the AI chatbot about your symptoms in detail</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-purple-100">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Analysis</h3>
                    <p className="text-sm text-gray-600 mt-1">Advanced AI evaluates urgency (1-5 scale)</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-pink-100">
                    <span className="text-pink-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Smart Routing</h3>
                    <p className="text-sm text-gray-600 mt-1">Find nearest hospital matching your urgency</p>
                  </div>
                </div>
              </div>

              {/* Severity Guide */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Urgency Levels</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-700"><strong>1-2:</strong> Mild</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700"><strong>3:</strong> Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-700"><strong>4:</strong> Requires Attention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700"><strong>5:</strong> Urgent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Chatbot */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col h-[600px]">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Chat with AI Assistant</h2>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : msg.role === 'system'
                        ? 'bg-green-100 text-green-800 font-bold rounded-bl-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {messageReceived && score && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                  <p className="text-green-800">
                    ✓ Score: <strong>{score}/5</strong> - {displayText} Redirecting...
                  </p>
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Describe your symptoms..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || messageReceived}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || loading || messageReceived}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                >
                  {loading ? 'Analyzing...' : 'Send'}
                </button>
              </div>

              <div className="text-sm text-gray-500 text-center mt-3">
                Describe your symptoms and press Enter or click Send
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
