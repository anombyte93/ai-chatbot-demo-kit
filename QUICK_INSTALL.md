# ⚡ Quick Install - One Command

## Install Into Any Project

```bash
npx degit anombyte93/ai-chatbot-demo-kit my-project/chatbot
```

That's it! The chatbot is now in `my-project/chatbot/`

## Setup (30 seconds)

```bash
cd my-project/chatbot
npm install
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
```

## Use in Your Project

### Backend (Express.js)
```typescript
// server/index.ts
import { AIService } from './chatbot/server/services/aiService';
import { createChatRoutes } from './chatbot/server/routes/chatRoutes';
import { getPromptTemplate } from './chatbot/config/prompts';

const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  systemPrompt: getPromptTemplate('customer-support')?.systemPrompt,
});

// ... setup storage and routes (see chatbot/examples/simple-example.ts)
```

### Frontend (React)
```tsx
// App.tsx
import { AIAssistant } from './chatbot/client/components/AIAssistant';

<AIAssistant config={{ apiEndpoint: '/api/chat' }} />
```

## What You Get

✅ Context-aware AI chatbot widget
✅ 7 pre-made prompt templates
✅ Optional RAG (knowledge base search)
✅ File upload support
✅ SSE streaming responses
✅ Complete documentation

## Full Docs

- **README.md** - Complete guide
- **INSTALLATION.md** - All installation methods
- **examples/** - Working examples

## Update Later

```bash
npx degit anombyte93/ai-chatbot-demo-kit my-project/chatbot --force
```

---

**GitHub:** https://github.com/anombyte93/ai-chatbot-demo-kit
**Ready to use in 60 seconds!** 🚀
