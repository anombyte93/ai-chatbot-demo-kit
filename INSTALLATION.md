# Installation Guide

## Quick Install (Recommended)

### Option 1: Using degit (One Command) ⭐ Recommended
```bash
npx degit anombyte93/ai-chatbot-demo-kit my-project/chatbot
cd my-project/chatbot
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

### Option 2: Using Git Clone
```bash
git clone https://github.com/anombyte93/ai-chatbot-demo-kit.git my-project/chatbot
cd my-project/chatbot
rm -rf .git  # Remove git history
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

### Option 3: Using Git Submodule (for tracking updates)
```bash
cd my-project
git submodule add https://github.com/anombyte93/ai-chatbot-demo-kit.git chatbot
cd chatbot
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

## What Gets Installed

```
my-project/
└── chatbot/                      # or whatever name you chose
    ├── client/
    │   └── components/
    │       └── AIAssistant.tsx
    ├── server/
    │   ├── services/
    │   │   ├── aiService.ts
    │   │   └── ragService.ts
    │   └── routes/
    │       └── chatRoutes.ts
    ├── config/
    │   └── prompts.ts
    ├── examples/
    ├── .env                       # Your config
    └── package.json
```

## Next Steps

1. **Configure Environment**
   ```bash
   # Edit .env
   OPENAI_API_KEY=sk-your-key-here
   ```

2. **Import in Your Backend**
   ```typescript
   // server/index.ts
   import { AIService } from './chatbot/server/services/aiService';
   import { createChatRoutes } from './chatbot/server/routes/chatRoutes';
   import { getPromptTemplate } from './chatbot/config/prompts';

   const aiService = new AIService({
     openaiApiKey: process.env.OPENAI_API_KEY,
     systemPrompt: getPromptTemplate('customer-support')?.systemPrompt,
   });

   // ... setup routes (see examples/simple-example.ts)
   ```

3. **Import in Your Frontend**
   ```tsx
   // App.tsx
   import { AIAssistant } from './chatbot/client/components/AIAssistant';

   <AIAssistant config={{ apiEndpoint: '/api/chat' }} />
   ```

## Updating

If installed via git submodule:
```bash
cd my-project/chatbot
git pull origin main
npm install
```

If installed via degit/clone:
```bash
# Re-run the installation command to get latest version
npx degit anombyte93/ai-chatbot-demo-kit my-project/chatbot --force
```

## Troubleshooting

### Missing Dependencies
```bash
cd my-project/chatbot
npm install
```

### Module Not Found
Make sure you're importing from the correct path:
```typescript
// ❌ Wrong
import { AIService } from 'ai-chatbot-demo-kit';

// ✅ Correct
import { AIService } from './chatbot/server/services/aiService';
```

### TypeScript Errors
Add to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@chatbot/*": ["./chatbot/*"]
    }
  }
}
```

## Complete Example

See `examples/simple-example.ts` for a working Express.js server, or `examples/react-example.tsx` for React integration.
