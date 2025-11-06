/**
 * Simple Express.js Example
 *
 * This example shows how to quickly integrate the AI chatbot into an Express.js app
 */

import express from 'express';
import { AIService } from '../server/services/aiService';
import { createChatRoutes } from '../server/routes/chatRoutes';
import { getPromptTemplate } from '../config/prompts';

const app = express();
app.use(express.json());

// Simple in-memory storage for demo purposes
const conversations = new Map();
const messages = new Map();

const storage = {
  async createConversation(title: string) {
    const id = `conv-${Date.now()}`;
    const conversation = { id, title, createdAt: new Date() };
    conversations.set(id, conversation);
    return conversation;
  },

  async getConversation(id: string) {
    return conversations.get(id) || null;
  },

  async createMessage(conversationId: string, role: string, content: string) {
    const id = `msg-${Date.now()}-${Math.random()}`;
    const message = { id, conversationId, role, content, createdAt: new Date() };

    if (!messages.has(conversationId)) {
      messages.set(conversationId, []);
    }
    messages.get(conversationId).push(message);

    return message;
  },

  async getMessage(id: string) {
    for (const [conversationId, msgs] of messages.entries()) {
      const message = msgs.find((m: any) => m.id === id);
      if (message) return message;
    }
    return null;
  },

  async getRecentMessages(conversationId: string, limit: number) {
    const msgs = messages.get(conversationId) || [];
    return msgs.slice(-limit).map((m: any) => ({
      role: m.role,
      content: m.content
    }));
  },
};

// Initialize AI service with customer support template
const aiService = new AIService(
  {
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    systemPrompt: getPromptTemplate('customer-support')?.systemPrompt,
    enableRAG: false,
  },
  storage
);

// Create and mount chat routes
const chatRoutes = createChatRoutes({
  aiService,
  storage,
});

app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: aiService.isOpenAIConfigured(),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🤖 AI configured: ${aiService.isOpenAIConfigured()}`);
  console.log(`📡 Chat API available at: http://localhost:${PORT}/api/chat`);
});

export default app;
