/**
 * LanceDB RAG Setup for Smartpay Copilot
 * Location: fintech/smartpay/backend/src/lib/lancedb.ts
 * Reference: PRD §4.6.2, LanceDB vector search
 *
 * Uses @lancedb/lancedb (vectordb package is deprecated).
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'prd' | 'faq' | 'policy' | 'regulation' | 'user_guide';
    section?: string;
    tags?: string[];
  };
  embedding?: number[];
  createdAt: Date;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  distance: number;
}

export interface LanceDBConnection {
  search: (query: string, limit?: number) => Promise<SearchResult[]>;
  ingest: (chunks: DocumentChunk[]) => Promise<void>;
  delete: (id: string) => Promise<void>;
  update: (id: string, chunk: Partial<DocumentChunk>) => Promise<void>;
}

let lanceDBInstance: LanceDBConnection | null = null;
let lanceTable: unknown | null = null;

/**
 * Initialize LanceDB connection
 * 
 * Usage:
 * ```typescript
 * const db = await initLanceDB();
 * const results = await db.search("How do I cash out?", 5);
 * ```
 */
export async function initLanceDB(): Promise<LanceDBConnection> {
  if (lanceDBInstance) {
    return lanceDBInstance;
  }

  try {
    const lancedb = await import('@lancedb/lancedb');
    const { OpenAIEmbeddings } = await import('@langchain/openai');
    const path = await import('path');
    const fs = await import('fs/promises');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. Using mock LanceDB implementation.');
      return createMockLanceDB();
    }

    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      openAIApiKey: apiKey,
    });

    const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb');
    await fs.mkdir(dbPath, { recursive: true });

    const db = await lancedb.connect(dbPath);
    console.log(`[LanceDB] Connected to: ${dbPath}`);

    try {
      lanceTable = await db.openTable('smartpay_knowledge');
      console.log('LanceDB table "smartpay_knowledge" opened');
    } catch {
      console.log('Creating new LanceDB table "smartpay_knowledge"...');
    }

    lanceDBInstance = {
      search: async (query: string, limit = 5): Promise<SearchResult[]> => {
        try {
          console.log(`[LanceDB] Searching: "${query}" (limit: ${limit})`);

          const queryEmbedding = await embeddings.embedQuery(query);

          if (!lanceTable) {
            console.warn('[LanceDB] Table not initialized. Returning empty results.');
            return [];
          }

          const results = await (lanceTable as { vectorSearch: (v: number[]) => { limit: (n: number) => { toArray: () => Promise<unknown[]> } } })
            .vectorSearch(queryEmbedding)
            .limit(limit)
            .toArray();

          console.log(`[LanceDB] Found ${results.length} results`);

          type SearchRow = {
            id: string;
            content: string;
            metadata: DocumentChunk['metadata'];
            createdAt: string;
            _distance?: number;
          };
          return (results as SearchRow[]).map((result) => ({
            chunk: {
              id: result.id,
              content: result.content,
              metadata: result.metadata,
              createdAt: new Date(result.createdAt),
            },
            score: result._distance != null ? 1 - result._distance : 1,
            distance: result._distance ?? 0,
          }));
        } catch (error) {
          console.error('[LanceDB] Search error:', error);
          return [];
        }
      },

      ingest: async (chunks: DocumentChunk[]): Promise<void> => {
        try {
          if (chunks.length === 0) return;

          console.log(`[LanceDB] Ingesting ${chunks.length} chunks...`);

          const contents = chunks.map((c) => c.content);
          const chunkEmbeddings = await embeddings.embedDocuments(contents);

          const data = chunks.map((chunk, i) => ({
            id: chunk.id,
            content: chunk.content,
            metadata: chunk.metadata,
            createdAt: chunk.createdAt.toISOString(),
            vector: chunkEmbeddings[i],
          }));

          if (!lanceTable) {
            lanceTable = await db.createTable('smartpay_knowledge', data);
            console.log(`[LanceDB] Created table with ${chunks.length} chunks`);
          } else {
            await (lanceTable as { add: (data: unknown[]) => Promise<unknown> }).add(data);
            console.log(`[LanceDB] Added ${chunks.length} chunks`);
          }
        } catch (error) {
          console.error('[LanceDB] Ingest error:', error);
          throw error;
        }
      },

      delete: async (id: string): Promise<void> => {
        if (!lanceTable) {
          console.warn('LanceDB table not initialized');
          return;
        }
        try {
          await (lanceTable as { delete: (filter: string) => Promise<void> }).delete(`id = '${id}'`);
          console.log(`Deleted chunk ${id} from LanceDB`);
        } catch (error) {
          console.error('LanceDB delete error:', error);
          throw error;
        }
      },
      
      update: async (id: string, chunk: Partial<DocumentChunk>): Promise<void> => {
        // LanceDB doesn't support direct updates, so delete and re-insert
        await lanceDBInstance!.delete(id);
        
        if (chunk.content) {
          await lanceDBInstance!.ingest([chunk as DocumentChunk]);
        }
      },
    };

    console.log('LanceDB initialized successfully');
    return lanceDBInstance;
  } catch (error) {
    console.error('Failed to initialize LanceDB:', error);
    console.log('Falling back to mock implementation');
    return createMockLanceDB();
  }
}

/**
 * Create mock LanceDB implementation (for development/testing without API key)
 */
function createMockLanceDB(): LanceDBConnection {
  const mockData: SearchResult[] = [];

  return {
    search: async (query: string, limit = 5): Promise<SearchResult[]> => {
      console.log(`Mock LanceDB search: "${query}" (limit: ${limit})`);
      
      // Simple keyword matching for mock
      const lowerQuery = query.toLowerCase();
      const filtered = mockData.filter((result) =>
        result.chunk.content.toLowerCase().includes(lowerQuery) ||
        result.chunk.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );

      return filtered.slice(0, limit);
    },
    
    ingest: async (chunks: DocumentChunk[]): Promise<void> => {
      console.log(`Mock LanceDB ingest: ${chunks.length} chunks`);
      chunks.forEach((chunk) => {
        mockData.push({
          chunk,
          score: 1.0,
          distance: 0.0,
        });
      });
    },
    
    delete: async (id: string): Promise<void> => {
      const index = mockData.findIndex((result) => result.chunk.id === id);
      if (index >= 0) {
        mockData.splice(index, 1);
      }
    },
    
    update: async (id: string, chunk: Partial<DocumentChunk>): Promise<void> => {
      const index = mockData.findIndex((result) => result.chunk.id === id);
      if (index >= 0) {
        const existing = mockData[index];
        if (existing) {
          existing.chunk = { ...existing.chunk, ...chunk } as DocumentChunk;
        }
      }
    },
  };
}

/**
 * Ingest PRD excerpts into LanceDB
 */
export async function ingestPRDDocuments(db: LanceDBConnection): Promise<void> {
  const prdChunks: DocumentChunk[] = [
    {
      id: 'prd-001',
      content: 'Smartpay is an agentic banking copilot for wallet services in Namibia. It supports G2P disbursements, P2P transfers, cash-out, voucher redemption, and bill payments.',
      metadata: {
        source: 'PRD_AGENTIC_COPILOT.md',
        type: 'prd',
        section: 'Overview',
        tags: ['smartpay', 'features', 'overview'],
      },
      createdAt: new Date(),
    },
    {
      id: 'prd-002',
      content: 'Cash-out methods: Users can cash out via agent (NAMQR QR code), merchant (NAMQR), ATM, or bank branch. NAMQR v5.0 standard is used for QR code generation.',
      metadata: {
        source: 'PRD_AGENTIC_COPILOT.md',
        type: 'prd',
        section: 'Cash-out',
        tags: ['cashout', 'namqr', 'agent'],
      },
      createdAt: new Date(),
    },
    {
      id: 'prd-003',
      content: 'USSD channel: Users with feature phones can access Smartpay services via USSD. Bank USSD codes: FNB (*140*321#), Bank Windhoek (*140*295#), Nedbank (*140*001#), Standard Bank (*140*6626#).',
      metadata: {
        source: 'PRD_AGENTIC_COPILOT.md',
        type: 'prd',
        section: 'USSD',
        tags: ['ussd', 'offline', 'feature-phone'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-001',
      content: 'Q: How do I check my balance? A: You can check your balance by asking the copilot "What is my balance?" or using USSD by dialing your bank\'s USSD code.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['balance', 'faq'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-002',
      content: 'Q: What are the transaction limits? A: Transaction limits depend on your KYC tier. Basic tier: N$1000/day, Intermediate tier: N$5000/day, Full tier: N$50000/day.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['limits', 'kyc', 'faq'],
      },
      createdAt: new Date(),
    },
    {
      id: 'policy-001',
      content: 'PSD-3 E-money Limits: All e-money transactions must comply with Bank of Namibia PSD-3 limits for balance and transaction amounts based on KYC tier.',
      metadata: {
        source: 'NPS Legal Framework',
        type: 'policy',
        tags: ['psd-3', 'compliance', 'limits'],
      },
      createdAt: new Date(),
    },
  ];
  
  await db.ingest(prdChunks);
  console.log(`Ingested ${prdChunks.length} PRD chunks into LanceDB`);
}

/**
 * Search knowledge base (RAG)
 */
export async function searchKnowledge(
  query: string,
  limit = 3
): Promise<SearchResult[]> {
  const db = await initLanceDB();
  return db.search(query, limit);
}

/**
 * Generate RAG context for agent
 */
export async function generateRAGContext(
  userQuery: string,
  topK = 3
): Promise<string> {
  const results = await searchKnowledge(userQuery, topK);
  
  if (results.length === 0) {
    return '';
  }
  
  const context = results
    .map((r, i) => `[${i + 1}] ${r.chunk.content} (source: ${r.chunk.metadata.source})`)
    .join('\n\n');
  
  return `\nRelevant context from knowledge base:\n${context}\n`;
}

/**
 * Update knowledge base with new content
 */
export async function updateKnowledgeBase(
  chunks: DocumentChunk[]
): Promise<void> {
  const db = await initLanceDB();
  await db.ingest(chunks);
}

/**
 * Setup initial knowledge base (run once on deployment)
 */
export async function setupKnowledgeBase(): Promise<void> {
  console.log('Setting up Smartpay knowledge base...');
  
  const db = await initLanceDB();
  await ingestPRDDocuments(db);
  
  console.log('Knowledge base setup complete');
}
