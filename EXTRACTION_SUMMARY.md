# AI Chatbot Extraction Summary

## What Was Extracted

This package contains a complete, standalone AI chatbot system extracted from the Crane Hire WA demo project. All Crane-specific code has been removed and replaced with generic, configurable options.

## Files Created

### Frontend Components
- **`client/components/AIAssistant.tsx`** - Main React chatbot component
  - Floating widget UI
  - Minimizable, fullscreen modes
  - File upload support (optional)
  - Context-aware conversations
  - Instant message display (no typing animation)
  - Risk level indicators (optional)
  - Suggested questions
  - Sources/citations display

### Backend Services
- **`server/services/aiService.ts`** - OpenAI integration service
  - Streaming responses via SSE
  - Context building (page context + conversation history + RAG)
  - Configurable system prompts
  - Provider-agnostic architecture
  - Error handling and fallbacks

- **`server/services/ragService.ts`** - Optional vector database service
  - ChromaDB integration
  - Document storage and retrieval
  - Semantic search
  - Relevance scoring
  - Easy to enable/disable

### API Routes
- **`server/routes/chatRoutes.ts`** - Express.js API endpoints
  - `POST /conversations` - Create conversation
  - `POST /messages` - Send message
  - `GET /stream/:messageId` - Stream AI response (SSE)
  - `GET /history/:conversationId` - Get message history
  - `GET /status` - Check configuration

### Configuration
- **`config/prompts.ts`** - 7 pre-made system prompt templates
  1. **Customer Support Agent** (recommended) - Friendly support persona
  2. **Technical Documentation Assistant** (recommended) - Developer-focused
  3. **Compliance & Regulatory Advisor** - Standards and regulations expert
  4. **Sales & Product Assistant** - Product information and sales
  5. **General Purpose Assistant** (recommended) - Versatile helper
  6. **Educational Tutor** - Patient teaching persona
  7. **Code Review Assistant** - Code quality and security reviewer

### Documentation
- **`README.md`** - Complete setup and usage guide
- **`EXTRACTION_SUMMARY.md`** - This file
- **`examples/simple-example.ts`** - Express.js integration example
- **`examples/react-example.tsx`** - React component usage example

## Key Changes from Original

### Removed
- ✂️ All Crane Hire WA specific branding
- ✂️ ISO 45001 compliance references
- ✂️ Industry-specific risk keywords
- ✂️ Hardcoded page routes (`/policies`, `/analysis`, etc.)
- ✂️ Typing animation (replaced with instant display)
- ✂️ Crane-specific context data

### Made Generic
- 🔧 Configurable system prompts (7 templates + custom)
- 🔧 Context provider function (inject any data)
- 🔧 Suggested questions (customize per deployment)
- 🔧 Position and styling options
- 🔧 Optional features (file upload, RAG, risk detection)
- 🔧 Storage interface (use any database)

### Added
- ✨ Provider-agnostic architecture
- ✨ Multiple prompt templates for different use cases
- ✨ Comprehensive configuration options
- ✨ Example implementations
- ✨ Instant message display
- ✨ Easy RAG integration
- ✨ Better error handling

## How to Use in Your Project

### Option 1: Copy Directory
```bash
cp -r ai-chatbot-demo-kit your-project/
```

### Option 2: Git Submodule
```bash
cd your-project
git submodule add <repo-url> ai-chatbot-demo-kit
```

### Option 3: NPM Package (if published)
```bash
npm install ai-chatbot-demo-kit
```

## Integration Steps

### 1. Install Dependencies
```bash
npm install openai chromadb react-dropzone lucide-react
```

### 2. Set Environment Variables
```bash
# .env
OPENAI_API_KEY=sk-your-key-here
CHROMA_URL=http://localhost:8000  # Optional, for RAG
```

### 3. Set Up Backend
See `examples/simple-example.ts` for a complete Express.js setup.

Key steps:
1. Initialize `AIService` with config and system prompt
2. Optionally initialize `ChromaRAGService`
3. Implement storage interface (or use in-memory for demo)
4. Create chat routes with `createChatRoutes()`
5. Mount routes at `/api/chat`

### 4. Set Up Frontend
See `examples/react-example.tsx` for React integration.

Key steps:
1. Import `AIAssistant` component
2. Configure with your API endpoint
3. Provide `contextProvider` function
4. Customize welcome message, position, features

## Customization Guide

### Change AI Persona
```typescript
// Use a pre-made template
import { getPromptTemplate } from './config/prompts';

const aiService = new AIService({
  systemPrompt: getPromptTemplate('technical-docs')?.systemPrompt,
});

// Or create your own
const aiService = new AIService({
  systemPrompt: `You are a specialized AI for...`,
});
```

### Enable RAG
```typescript
// Start ChromaDB
// docker run -p 8000:8000 chromadb/chroma

const ragService = new ChromaRAGService({
  collectionName: 'my-knowledge-base',
});

await ragService.initialize();
await ragService.storeDocuments([...]);

const aiService = new AIService({
  enableRAG: true,
  ragService,
});
```

### Customize UI
```typescript
<AIAssistant
  config={{
    welcomeMessage: 'Custom message',
    position: 'bottom-left',
    enableFileUpload: false,
    enableRiskDetection: true,
    // ... more options
  }}
/>
```

### Add Context
```typescript
<AIAssistant
  config={{
    contextProvider: () => ({
      // Pass any data you want the AI to know
      currentPage: window.location.pathname,
      userInfo: getCurrentUser(),
      appState: getAppState(),
    }),
  }}
/>
```

## Storage Implementation

You must implement the `ConversationStorage` interface:

```typescript
interface ConversationStorage {
  createConversation(title: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;
  getRecentMessages(conversationId: string, limit: number): Promise<Message[]>;
}
```

Options:
- **In-memory** (demo only) - See `examples/simple-example.ts`
- **PostgreSQL** - Use Drizzle ORM like original project
- **MongoDB** - Use Mongoose
- **SQLite** - Use better-sqlite3
- **Firebase** - Use Firestore
- **Any database** - Implement the interface

## Testing Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Backend server starts successfully
- [ ] Chat widget appears on page
- [ ] Can create conversation
- [ ] Can send messages
- [ ] Receives AI responses (streaming)
- [ ] File upload works (if enabled)
- [ ] RAG retrieval works (if enabled)
- [ ] Context is passed correctly
- [ ] Messages display instantly (no typing animation)
- [ ] Widget minimizes/maximizes/closes
- [ ] Suggested questions work
- [ ] Error handling works

## Next Steps

1. **Customize prompts** - Choose or create system prompt for your use case
2. **Implement storage** - Connect to your database
3. **Add branding** - Customize colors, logo, welcome message
4. **Enable RAG** (optional) - Add your knowledge base
5. **Deploy** - Deploy backend and frontend together

## Deployment Notes

### Vercel/Netlify
- Use Next.js API routes instead of Express
- Store conversations in Vercel KV or Supabase

### Railway/Render
- Deploy Express backend as-is
- Connect to PostgreSQL or MongoDB

### Docker
- Create Dockerfile for Express app
- Include ChromaDB container if using RAG

## Support

This is a demo tool extracted for personal use. Customize as needed for your projects.

## Original Source

Extracted from: Crane Hire WA Risk & Compliance Hub demo
Location: `/home/anombyte/Projects/projects/Client Work/Crane_Hire_WA_Demo/Crane-Hire-Demo-v1/`
Extraction Date: 2025-11-06

---

**Ready to drop into any demo project and start chatting!**
