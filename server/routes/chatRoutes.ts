import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import type { RAGService } from '../services/ragService';

export interface ChatRoutesConfig {
  aiService: AIService;
  storage: ConversationStorage;
  ragService?: RAGService;
}

export interface ConversationStorage {
  createConversation(title: string): Promise<{ id: string; title: string; createdAt: Date }>;
  getConversation(id: string): Promise<{ id: string; title: string; createdAt: Date } | null>;
  createMessage(conversationId: string, role: string, content: string): Promise<{ id: string; conversationId: string; role: string; content: string; createdAt: Date }>;
  getMessage(id: string): Promise<{ id: string; conversationId: string; role: string; content: string; createdAt: Date } | null>;
  getRecentMessages(conversationId: string, limit: number): Promise<Array<{ role: string; content: string }>>;
}

export function createChatRoutes(config: ChatRoutesConfig): Router {
  const router = Router();
  const { aiService, storage, ragService } = config;

  // POST /conversations - Create new conversation
  router.post("/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await storage.createConversation(title || "New Conversation");

      res.json({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
      });
    } catch (error: any) {
      console.error("[ChatRoutes] Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // GET /conversations/:id - Get single conversation
  router.get("/conversations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error: any) {
      console.error("[ChatRoutes] Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // POST /messages - Send message, initiate stream
  router.post("/messages", async (req: Request, res: Response) => {
    try {
      const { conversationId, content, context } = req.body;

      if (!conversationId || !content) {
        return res.status(400).json({ error: "Missing conversationId or content" });
      }

      // Verify conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Store user message
      const userMessage = await storage.createMessage(
        conversationId,
        "user",
        content
      );

      // Create placeholder for assistant message
      const assistantMessage = await storage.createMessage(
        conversationId,
        "assistant",
        "" // Will be filled by streaming
      );

      console.log(`[ChatRoutes] Created message ${userMessage.id} for conversation ${conversationId}`);

      res.json({
        messageId: assistantMessage.id,
        userMessageId: userMessage.id,
        streamUrl: `/stream/${assistantMessage.id}`,
      });
    } catch (error: any) {
      console.error("[ChatRoutes] Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // GET /stream/:messageId - SSE streaming endpoint
  router.get("/stream/:messageId", async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const contextParam = req.query.context as string | undefined;

    let pageContext = {};
    if (contextParam) {
      try {
        pageContext = JSON.parse(contextParam);
      } catch (e) {
        console.warn("[ChatRoutes] Failed to parse context parameter:", e);
      }
    }

    try {
      // Get the message to find conversation
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const conversationId = message.conversationId;

      // Get recent messages for context
      const recentMessages = await storage.getRecentMessages(conversationId, 10);
      const lastUserMessage = [...recentMessages].reverse().find(m => m.role === 'user');

      if (!lastUserMessage) {
        return res.status(400).json({ error: "No user message found" });
      }

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let fullResponse = '';

      try {
        // Stream response from AI service
        const stream = aiService.streamChatCompletion(
          conversationId,
          lastUserMessage.content,
          pageContext
        );

        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            // Text content chunk
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          } else if (chunk.type === 'sources') {
            // Sources metadata
            res.write(`data: ${JSON.stringify({ type: 'sources', sources: chunk.sources })}\n\n`);
          }
        }

        // Update stored message with full response
        // Note: This requires adding an updateMessage method to storage interface
        // await storage.updateMessage(messageId, fullResponse);

        // Send completion
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

        console.log(`[ChatRoutes] Stream completed for message ${messageId}`);
      } catch (streamError: any) {
        console.error("[ChatRoutes] Error in stream:", streamError);
        res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error("[ChatRoutes] Error in stream endpoint:", error);

      // If headers not sent yet, send error as JSON
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream response" });
      } else {
        // Headers already sent (SSE started), send error event
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      }
    }
  });

  // GET /history/:conversationId - Get message history
  router.get("/history/:conversationId", async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getRecentMessages(conversationId, 50);

      res.json({ messages });
    } catch (error: any) {
      console.error("[ChatRoutes] Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // GET /status - Check if chat is configured
  router.get("/status", async (req: Request, res: Response) => {
    res.json({
      aiConfigured: aiService.isOpenAIConfigured(),
      ragAvailable: ragService?.isAvailable() || false,
    });
  });

  return router;
}
