import OpenAI from 'openai';
import type { RAGService } from './ragService';

export interface AIServiceConfig {
  openaiApiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableRAG?: boolean;
  ragService?: RAGService;
}

interface PageContext {
  currentPage?: string;
  page?: string;
  route?: string;
  userRole?: string;
  recentActions?: string[];
  navigationHistory?: string[];
  timestamp?: string;
  [key: string]: any;
}

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationHistory {
  getRecentMessages(conversationId: string, limit: number): Promise<Array<{
    role: string;
    content: string;
  }>>;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and helpful responses to user questions.

## Communication Style:
- Professional but approachable
- Action-oriented with practical guidance
- Clear and concise explanations
- Use bullet points for clarity when appropriate

## Response Format:
1. Brief summary answering the question
2. Detailed explanation or steps
3. Additional context or examples if helpful

When uncertain:
- Admit knowledge gaps honestly
- Offer alternatives or related information
- Never guess or make up information
`;

export class AIService {
  private openai: OpenAI | null;
  private isConfigured: boolean;
  private config: AIServiceConfig;
  private conversationHistory: ConversationHistory | null = null;

  constructor(config: AIServiceConfig, conversationHistory?: ConversationHistory) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      enableRAG: false,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      ...config,
    };

    this.conversationHistory = conversationHistory || null;

    const apiKey = this.config.openaiApiKey;

    if (!apiKey || apiKey === '' || apiKey === 'sk-your-api-key-here') {
      console.warn('[AIService] OpenAI API key not configured. Chat will use mock responses.');
      this.openai = null;
      this.isConfigured = false;
    } else {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
      console.log('[AIService] OpenAI client initialized successfully');
    }
  }

  /**
   * Stream chat completion response from OpenAI
   * Returns both content chunks and sources at the end
   */
  async *streamChatCompletion(
    conversationId: string,
    userMessage: string,
    pageContext?: PageContext
  ): AsyncGenerator<string | { type: 'sources', sources: any[] }> {
    try {
      if (!this.isConfigured || !this.openai) {
        console.log('[AIService] Using mock streaming response');
        yield* this.mockStreamResponse(userMessage, pageContext);
        return;
      }

      const messages = await this.buildContext(conversationId, pageContext, userMessage);
      const ragSources = (messages as any).ragSources || [];

      console.log(`[AIService] Streaming response for conversation ${conversationId}`);

      const stream = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: messages,
        stream: true,
        temperature: this.config.temperature!,
        max_tokens: this.config.maxTokens!,
      });

      let totalTokens = 0;
      let hasContent = false;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
          totalTokens += content.length;
          hasContent = true;
        }
      }

      if (!hasContent) {
        console.warn(`[AIService] Empty response for conversation ${conversationId}`);
        yield 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
      }

      console.log(`[AIService] Stream completed for conversation ${conversationId} (${totalTokens} chars)`);

      if (ragSources.length > 0) {
        yield { type: 'sources', sources: ragSources };
      }
    } catch (error: any) {
      console.error('[AIService] Error in streamChatCompletion:', error);

      if (error.status === 429) {
        throw new Error('I\'m receiving too many requests right now. Please wait a moment and try again.');
      } else if (error.status === 401) {
        throw new Error('API authentication failed. Please contact your administrator.');
      } else if (error.status >= 500) {
        throw new Error('The AI service is temporarily unavailable. Please try again in a few moments.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('API usage limit reached. Please contact your administrator.');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      } else {
        throw new Error(`Unable to process your request: ${error.message || 'Unknown error'}. Please try again.`);
      }
    }
  }

  /**
   * Build conversation context for OpenAI
   */
  private async buildContext(
    conversationId: string,
    pageContext?: PageContext,
    userMessage?: string
  ): Promise<ChatCompletionMessage[]> {
    const messages: ChatCompletionMessage[] = [];

    // 1. System prompt
    messages.push({
      role: 'system',
      content: this.config.systemPrompt!,
    });

    // 2. Page context (if provided)
    if (pageContext && Object.keys(pageContext).length > 0) {
      messages.push({
        role: 'system',
        content: this.getPageContextPrompt(pageContext),
      });
    }

    // 3. RAG-enhanced context (retrieve relevant knowledge)
    const sources: any[] = [];

    if (userMessage && this.config.enableRAG && this.config.ragService) {
      try {
        const relevantDocs = await this.config.ragService.retrieveRelevantDocuments(userMessage, 3, 0.6);

        if (relevantDocs.length > 0) {
          console.log(`[AIService] Including ${relevantDocs.length} RAG results in context`);

          let ragContext = '**Relevant Information from Knowledge Base:**\n\n';

          relevantDocs.forEach((doc, idx) => {
            ragContext += `### ${doc.title}\n`;
            ragContext += `${doc.content}\n`;
            ragContext += `*(Relevance: ${(doc.relevanceScore * 100).toFixed(0)}%)*\n\n`;

            sources.push({
              type: doc.type || 'knowledge-base',
              title: doc.title,
              href: doc.href,
              relevance: doc.relevanceScore
            });
          });

          ragContext += '\nUse this information to provide accurate guidance. Cite sources when relevant.';

          messages.push({
            role: 'system',
            content: ragContext,
          });
        }
      } catch (error) {
        console.warn('[AIService] RAG retrieval failed, continuing without RAG:', error);
      }
    }

    (messages as any).ragSources = sources;

    // 4. Recent conversation history (last 10 messages)
    if (this.conversationHistory) {
      const history = await this.conversationHistory.getRecentMessages(conversationId, 10);

      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }
    }

    // 5. Current user message
    if (userMessage) {
      messages.push({
        role: 'user',
        content: userMessage,
      });
    }

    return messages;
  }

  /**
   * Get page-specific context prompt
   */
  private getPageContextPrompt(pageContext: PageContext): string {
    let contextText = `Current Context:\n`;

    const currentPage = pageContext.currentPage || pageContext.page || pageContext.route;
    if (currentPage) {
      contextText += `- Page: ${currentPage}\n`;
    }

    if (pageContext.userRole) {
      contextText += `- User Role: ${pageContext.userRole}\n`;
    }

    if (pageContext.navigationHistory && pageContext.navigationHistory.length > 0) {
      contextText += `- Recent Pages: ${pageContext.navigationHistory.join(' → ')}\n`;
    }

    if (pageContext.recentActions && pageContext.recentActions.length > 0) {
      contextText += `- Recent Actions:\n`;
      pageContext.recentActions.forEach(action => {
        contextText += `  * ${action}\n`;
      });
    }

    // Include any other custom context fields
    Object.keys(pageContext).forEach(key => {
      if (!['currentPage', 'page', 'route', 'userRole', 'navigationHistory', 'recentActions', 'timestamp'].includes(key)) {
        contextText += `- ${key}: ${JSON.stringify(pageContext[key])}\n`;
      }
    });

    contextText += '\nBased on this context, provide relevant and specific assistance.';

    return contextText;
  }

  /**
   * Mock streaming response for demo purposes
   */
  private async *mockStreamResponse(
    userMessage: string,
    pageContext?: PageContext
  ): AsyncGenerator<string> {
    const mockResponses = [
      "I understand your question. ",
      "Based on the current context, ",
      "I can help you with that. ",
      "\n\nHere are some key points:\n",
      "1. This is a mock response for demonstration\n",
      "2. Configure OpenAI API key for real responses\n",
      "3. I'm ready to help once configured\n\n",
      "Would you like more information?"
    ];

    for (const chunk of mockResponses) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield chunk;
    }
  }

  /**
   * Update system prompt
   */
  updateSystemPrompt(systemPrompt: string) {
    this.config.systemPrompt = systemPrompt;
  }

  /**
   * Check if OpenAI is configured
   */
  isOpenAIConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
}
