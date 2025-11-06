import { ChromaClient, Collection, type EmbeddingFunction } from 'chromadb';
import { DefaultEmbeddingFunction } from 'chromadb-default-embed';

export interface Document {
  id: string;
  title: string;
  content: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface RetrievalResult {
  title: string;
  content: string;
  relevanceScore: number;
  type?: string;
  href?: string;
  metadata?: Record<string, any>;
}

export interface RAGServiceConfig {
  chromaUrl?: string;
  collectionName?: string;
  embeddingFunction?: Embedding Function;
}

export interface RAGService {
  retrieveRelevantDocuments(query: string, nResults?: number, minRelevanceScore?: number): Promise<RetrievalResult[]>;
  storeDocuments(documents: Document[]): Promise<void>;
  isAvailable(): boolean;
}

export class ChromaRAGService implements RAGService {
  private chromaClient: ChromaClient;
  private collection: Collection | null = null;
  private embeddingFunction: EmbeddingFunction;
  private isInitialized: boolean = false;
  private collectionName: string;

  constructor(config?: RAGServiceConfig) {
    this.collectionName = config?.collectionName || 'knowledge_base';

    this.chromaClient = new ChromaClient({
      path: config?.chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000'
    });

    // Use ChromaDB's default embedding function (all-MiniLM-L6-v2)
    // This runs locally and doesn't require any API keys
    this.embeddingFunction = config?.embeddingFunction || new DefaultEmbeddingFunction();
    console.log('[RAGService] Using ChromaDB default embeddings (free, local)');
  }

  /**
   * Initialize or connect to the collection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[RAGService] Connecting to Chroma...');

      const collectionOptions: any = {
        name: this.collectionName,
        metadata: {
          description: 'AI Assistant Knowledge Base',
          created: new Date().toISOString()
        },
        embeddingFunction: this.embeddingFunction
      };

      try {
        this.collection = await this.chromaClient.getCollection(collectionOptions);
        console.log(`[RAGService] Connected to existing collection: ${this.collectionName}`);
      } catch (error) {
        this.collection = await this.chromaClient.createCollection(collectionOptions);
        console.log(`[RAGService] Created new collection: ${this.collectionName}`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[RAGService] Failed to initialize:', error);
      throw new Error('Failed to connect to vector database. Ensure Chroma is running.');
    }
  }

  /**
   * Store documents in the vector database
   */
  async storeDocuments(documents: Document[]): Promise<void> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      console.log(`[RAGService] Storing ${documents.length} documents...`);

      const ids = documents.map(d => d.id);
      const docs = documents.map(d => `${d.title}\n\n${d.content}`);
      const metadatas = documents.map(d => ({
        title: d.title,
        type: d.type || 'document',
        ...d.metadata
      }));

      await this.collection.add({
        ids,
        documents: docs,
        metadatas
      });

      console.log(`[RAGService] Successfully stored ${documents.length} documents`);
    } catch (error) {
      console.error('[RAGService] Error storing documents:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents based on a query
   */
  async retrieveRelevantDocuments(
    query: string,
    nResults: number = 3,
    minRelevanceScore: number = 0.5
  ): Promise<RetrievalResult[]> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      console.log(`[RAGService] Querying for: "${query.substring(0, 100)}..."`);

      const results = await this.collection.query({
        queryTexts: [query],
        nResults
      });

      const retrievalResults: RetrievalResult[] = [];

      if (results.ids && results.ids[0] && results.documents && results.documents[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 0;
          const relevanceScore = 1 - distance;

          if (relevanceScore >= minRelevanceScore) {
            const metadata = results.metadatas?.[0]?.[i] as any || {};

            retrievalResults.push({
              title: metadata.title || 'Unknown',
              content: results.documents[0][i] || '',
              relevanceScore,
              type: metadata.type,
              metadata
            });
          }
        }
      }

      console.log(`[RAGService] Retrieved ${retrievalResults.length} relevant documents`);
      return retrievalResults;
    } catch (error) {
      console.error('[RAGService] Error retrieving documents:', error);
      return [];
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{ count: number; isInitialized: boolean }> {
    try {
      await this.initialize();

      if (!this.collection) {
        return { count: 0, isInitialized: false };
      }

      const count = await this.collection.count();
      return { count, isInitialized: this.isInitialized };
    } catch (error) {
      console.error('[RAGService] Error getting stats:', error);
      return { count: 0, isInitialized: false };
    }
  }

  /**
   * Check if RAG service is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.collection !== null;
  }

  /**
   * Clear all documents from the collection
   */
  async clearCollection(): Promise<void> {
    try {
      await this.chromaClient.deleteCollection({ name: this.collectionName });

      const collectionOptions: any = {
        name: this.collectionName,
        metadata: {
          description: 'AI Assistant Knowledge Base',
          created: new Date().toISOString()
        },
        embeddingFunction: this.embeddingFunction
      };

      this.collection = await this.chromaClient.createCollection(collectionOptions);
      this.isInitialized = true;
      console.log('[RAGService] Collection cleared and recreated');
    } catch (error) {
      console.error('[RAGService] Error clearing collection:', error);
      throw error;
    }
  }
}
