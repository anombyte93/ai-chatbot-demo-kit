/**
 * React Component Example
 *
 * This example shows how to integrate the AI Assistant component into a React app
 */

import React from 'react';
import { AIAssistant } from '../client/components/AIAssistant';

function App() {
  // Track current page and user actions for context
  const [currentPage, setCurrentPage] = React.useState(window.location.pathname);
  const [recentActions, setRecentActions] = React.useState<string[]>([]);

  // Track page changes
  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPage(window.location.pathname);
      setRecentActions(prev => [...prev.slice(-4), `Navigated to ${window.location.pathname}`]);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your app content */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">My Demo App</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome!</h2>
          <p className="text-gray-600 mb-4">
            This is a demo app with an AI assistant. Click the chat button in the bottom-right to get started.
          </p>

          <div className="space-y-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => {
                setRecentActions(prev => [...prev.slice(-4), 'Clicked demo button']);
                alert('Button clicked! The AI knows about this action.');
              }}
            >
              Try Me
            </button>
          </div>
        </div>
      </main>

      {/* AI Assistant Widget */}
      <AIAssistant
        config={{
          apiEndpoint: '/api/chat',
          welcomeMessage: 'Hello! I\'m your AI assistant. I can help you navigate this demo and answer your questions.',
          placeholder: 'Ask me anything about this demo...',
          suggestedQuestions: [
            'What can you help me with?',
            'How does this demo work?',
            'What features are available?',
          ],
          position: 'bottom-right',
          enableFileUpload: true,
          enableRiskDetection: false,

          // Provide context about current state
          contextProvider: () => ({
            currentPage,
            recentActions: recentActions.slice(-3),
            userRole: 'demo-user',
            timestamp: new Date().toISOString(),
          }),
        }}
      />
    </div>
  );
}

export default App;
