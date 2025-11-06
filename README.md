# AI Chatbot Demo Kit

A **plug-and-play AI chatbot** designed for quick integration into demo projects. Features context-aware conversations, optional RAG (Retrieval-Augmented Generation), customizable system prompts, and instant message display.

Perfect for adding an AI assistant to any demo or prototype project in minutes.

## Features

- 🚀 **Quick Setup**: Drop into any project in minutes
- 🎯 **Context-Aware**: Automatically captures page context and user actions
- 📚 **Optional RAG**: Enable vector search for knowledge base integration (ChromaDB)
- 🎨 **Customizable**: Pre-made prompt templates + custom prompt support
- ⚡ **Instant Messages**: No typing animation, just instant responses
- 📎 **File Upload**: Support for PDFs, docs, images (optional)
- 🎭 **Multiple Personas**: Customer support, technical docs, compliance, sales, and more
- 🔌 **Provider-Agnostic**: Easy to swap AI providers (OpenAI default)

## Quick Start

### 1. Installation

```bash
# Clone or copy this directory into your project
cp -r ai-chatbot-demo-kit your-project/

# Or install via npm (if published)
npm install ai-chatbot-demo-kit
```

### 2. Install Dependencies

```bash
cd your-project
npm install openai chromadb react-dropzone
```

### 3. Backend Setup

```typescript
// server/index.ts
import express from 'express';
import { AIService } from './ai-chatbot-demo-kit/server/services/aiService';
import { ChromaRAGService } from './ai-chatbot-demo-kit/server/services/ragService';
import { createChatRoutes } from './ai-chatbot-demo-kit/server/routes/chatRoutes';
import { getPromptTemplate } from './ai-chatbot-demo-kit/config/prompts';

const app = express();
app.use(express.json());

// Initialize AI service
const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  systemPrompt: getPromptTemplate('customer-support')?.systemPrompt, // Use a pre-made template
  enableRAG: false, // Enable if you want RAG
});

// Optional: Initialize RAG service
// const ragService = new ChromaRAGService({ collectionName: 'my-knowledge-base' });
// await ragService.initialize();
// await ragService.storeDocuments([...your documents...]);

// Set up conversation storage (implement your own)
const storage = {
  async createConversation(title: string) {
    // Implement your storage logic (database, memory, etc.)
    return { id: 'conv-123', title, createdAt: new Date() };
  },
  async getConversation(id: string) {
    return { id, title: 'Conversation', createdAt: new Date() };
  },
  async createMessage(conversationId: string, role: string, content: string) {
    return { id: 'msg-123', conversationId, role, content, createdAt: new Date() };
  },
  async getMessage(id: string) {
    return { id, conversationId: 'conv-123', role: 'user', content: 'Hello', createdAt: new Date() };
  },
  async getRecentMessages(conversationId: string, limit: number) {
    return [];
  },
};

// Create chat routes
const chatRoutes = createChatRoutes({
  aiService,
  storage,
  // ragService, // Optional
});

// Mount routes
app.use('/api/chat', chatRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));
```

### 4. Frontend Setup

```typescript
// App.tsx
import { AIAssistant } from './ai-chatbot-demo-kit/client/components/AIAssistant';

function App() {
  return (
    <div>
      <h1>My Demo App</h1>

      {/* AI Assistant Widget */}
      <AIAssistant
        config={{
          apiEndpoint: '/api/chat',
          welcomeMessage: 'Hello! How can I help you today?',
          placeholder: 'Ask me anything...',
          suggestedQuestions: [
            'How do I get started?',
            'What features are available?',
            'Can you help me with X?',
          ],
          position: 'bottom-right',
          enableFileUpload: true,
          enableRiskDetection: false,
          contextProvider: () => ({
            // Provide context about current page/state
            currentPage: window.location.pathname,
            userRole: 'demo-user',
            // Add any custom context here
          }),
        }}
      />
    </div>
  );
}
```

## Configuration

### Pre-Made Prompt Templates

Choose from 7 pre-made system prompts:

```typescript
import { getPromptTemplate, PROMPT_TEMPLATES } from './config/prompts';

// Use a template
const customerSupportPrompt = getPromptTemplate('customer-support');
const technicalDocsPrompt = getPromptTemplate('technical-docs');
const compliancePrompt = getPromptTemplate('compliance-advisor');

// Available templates:
// - customer-support (recommended)
// - technical-docs (recommended)
// - general-assistant (recommended)
// - compliance-advisor
// - sales-assistant
// - education-tutor
// - code-reviewer
```

### Custom System Prompt

```typescript
const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  systemPrompt: `Your custom system prompt here...`,
});
```

### Enable RAG (Optional)

```typescript
// 1. Start ChromaDB (Docker)
// docker run -p 8000:8000 chromadb/chroma

// 2. Initialize RAG service
const ragService = new ChromaRAGService({
  chromaUrl: 'http://localhost:8000',
  collectionName: 'my-knowledge-base',
});

await ragService.initialize();

// 3. Store documents
await ragService.storeDocuments([
  {
    id: 'doc-1',
    title: 'Product Documentation',
    content: 'Full content of your document...',
    type: 'documentation',
  },
  {
    id: 'doc-2',
    title: 'FAQ',
    content: 'Frequently asked questions...',
    type: 'faq',
  },
]);

// 4. Enable in AIService
const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableRAG: true,
  ragService,
});
```

### Frontend Customization

```typescript
<AIAssistant
  config={{
    // API Configuration
    apiEndpoint: '/api/chat',

    // UI Customization
    welcomeMessage: 'Custom welcome message',
    placeholder: 'Type your question...',
    suggestedQuestions: ['Question 1', 'Question 2', 'Question 3'],
    position: 'bottom-right', // or 'bottom-left', 'top-right', 'top-left'

    // File Upload (optional)
    enableFileUpload: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: [
      'application/pdf',
      'application/msword',
      'text/plain',
      'image/png',
      'image/jpeg',
    ],

    // Risk Detection (optional)
    enableRiskDetection: true, // Shows risk badges for high/medium/low risk content

    // Context Provider
    contextProvider: () => ({
      currentPage: window.location.pathname,
      userRole: getUserRole(),
      recentActions: getRecentActions(),
      // Any custom data you want the AI to know about
    }),
  }}
/>
```

## Examples

### Example 1: Customer Support Bot

```typescript
// Backend
const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  systemPrompt: getPromptTemplate('customer-support')?.systemPrompt,
});

// Frontend
<AIAssistant
  config={{
    welcomeMessage: 'Hi! I\'m here to help. What can I assist you with?',
    suggestedQuestions: [
      'How do I reset my password?',
      'Where can I find my invoices?',
      'How do I contact support?',
    ],
    contextProvider: () => ({
      userPlan: 'premium',
      accountAge: '6 months',
    }),
  }}
/>
```

### Example 2: Technical Documentation Assistant

```typescript
// Backend with RAG
const ragService = new ChromaRAGService();
await ragService.initialize();
await ragService.storeDocuments([
  {
    id: 'api-auth',
    title: 'API Authentication',
    content: 'To authenticate, send a Bearer token...',
    type: 'api-docs',
  },
  {
    id: 'api-endpoints',
    title: 'API Endpoints',
    content: 'Available endpoints: POST /api/data...',
    type: 'api-docs',
  },
]);

const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  systemPrompt: getPromptTemplate('technical-docs')?.systemPrompt,
  enableRAG: true,
  ragService,
});

// Frontend
<AIAssistant
  config={{
    welcomeMessage: 'I can help you with API documentation and integration.',
    suggestedQuestions: [
      'How do I authenticate?',
      'Show me an example API call',
      'What endpoints are available?',
    ],
    enableFileUpload: false, // Disable for cleaner UI
  }}
/>
```

### Example 3: Compliance Advisor with Risk Detection

```typescript
// Backend
const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  systemPrompt: getPromptTemplate('compliance-advisor')?.systemPrompt,
});

// Frontend
<AIAssistant
  config={{
    welcomeMessage: 'I can help you with compliance and regulatory questions.',
    enableRiskDetection: true, // Show risk badges
    suggestedQuestions: [
      'What are the key GDPR requirements?',
      'How do I handle data breaches?',
      'What documentation do I need?',
    ],
    contextProvider: () => ({
      industry: 'healthcare',
      region: 'EU',
      complianceFramework: 'GDPR',
    }),
  }}
/>
```

## Architecture

```
ai-chatbot-demo-kit/
├── client/
│   └── components/
│       └── AIAssistant.tsx       # Main React component
├── server/
│   ├── services/
│   │   ├── aiService.ts          # OpenAI integration
│   │   └── ragService.ts         # Optional RAG (ChromaDB)
│   └── routes/
│       └── chatRoutes.ts         # Express.js API routes
├── config/
│   └── prompts.ts                # Pre-made system prompts
├── docs/
│   └── API.md                    # API documentation
└── examples/
    ├── express-example/          # Full Express.js example
    └── nextjs-example/           # Next.js example
```

## API Routes

The backend provides these endpoints:

- `POST /api/chat/conversations` - Create a new conversation
- `GET /api/chat/conversations/:id` - Get conversation details
- `POST /api/chat/messages` - Send a message
- `GET /api/chat/stream/:messageId` - Stream AI response (SSE)
- `GET /api/chat/history/:conversationId` - Get conversation history
- `GET /api/chat/status` - Check AI configuration status

## Storage Interface

Implement your own storage (database, memory, etc.):

```typescript
interface ConversationStorage {
  createConversation(title: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;
  getRecentMessages(conversationId: string, limit: number): Promise<Message[]>;
}
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (for RAG)
CHROMA_URL=http://localhost:8000
```

## Dependencies

### Frontend
- `react` (^18.0.0)
- `react-dropzone` (for file uploads)
- Tailwind CSS + shadcn/ui components (for UI)

### Backend
- `express` (^4.18.0)
- `openai` (^4.0.0)
- `chromadb` (^1.5.0) - optional, for RAG

## Roadmap

- [ ] Add support for Anthropic Claude
- [ ] Add support for Google Gemini
- [ ] Voice input support
- [ ] Multi-language support
- [ ] Analytics and usage tracking
- [ ] Rate limiting built-in
- [ ] Conversation export
- [ ] Message history search

## Contributing

This is a personal demo tool. Feel free to fork and customize for your own use.

## License

MIT

---

**Built for rapid AI chatbot integration into demo projects.**
