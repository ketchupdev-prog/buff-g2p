#!/usr/bin/env ts-node
/**
 * Smartpay Knowledge Base Ingestion Script
 * 
 * Ingests PRD documents, FAQs, and policies into LanceDB vector database
 * for RAG-based semantic search in the copilot.
 * 
 * Usage: npm run ingest-knowledge (or ts-node scripts/ingestKnowledgeBase.ts)
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { initLanceDB, DocumentChunk } from '../src/lib/lancedb';
import { v4 as uuidv4 } from 'uuid';

interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 800,
  chunkOverlap: 200,
  minChunkSize: 100,
};

async function chunkDocument(
  content: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): Promise<string[]> {
  const { chunkSize, chunkOverlap, minChunkSize } = options;
  
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length < chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk);
      }
      
      if (paragraph.length > chunkSize) {
        const sentences = paragraph.split(/[.!?]\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length < chunkSize) {
            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
          } else {
            if (sentenceChunk.length >= minChunkSize) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk.length >= minChunkSize) {
          currentChunk = sentenceChunk;
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk.length >= minChunkSize) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

async function ingestPRDDocument(): Promise<DocumentChunk[]> {
  console.log('\n📄 Ingesting PRD document...');
  
  const prdPath = path.join(__dirname, '../../PRD_AGENTIC_COPILOT.md');
  
  try {
    const prdContent = await fs.readFile(prdPath, 'utf-8');
    
    const sections = prdContent.split(/^## /m).filter(s => s.trim().length > 0);
    
    const chunks: DocumentChunk[] = [];
    
    for (const section of sections) {
      const lines = section.split('\n');
      const sectionTitle = lines[0]?.trim() || 'Unknown Section';
      const sectionContent = lines.slice(1).join('\n').trim();
      
      if (sectionContent.length < 100) continue;
      
      const textChunks = await chunkDocument(sectionContent, {
        chunkSize: 800,
        chunkOverlap: 200,
        minChunkSize: 100,
      });
      
      for (const [idx, chunk] of textChunks.entries()) {
        chunks.push({
          id: `prd-${sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx}`,
          content: chunk,
          metadata: {
            source: 'PRD_AGENTIC_COPILOT.md',
            type: 'prd',
            section: sectionTitle,
            tags: extractTags(sectionTitle, chunk),
          },
          createdAt: new Date(),
        });
      }
    }
    
    console.log(`✅ Created ${chunks.length} chunks from PRD`);
    return chunks;
  } catch (error) {
    console.error('❌ Failed to read PRD document:', error);
    return [];
  }
}

function extractTags(sectionTitle: string, content: string): string[] {
  const tags: string[] = [];
  
  const keywords = [
    'smartpay', 'wallet', 'g2p', 'p2p', 'cashout', 'cash-out', 'agent',
    'namqr', 'ussd', 'kyc', 'psd', 'compliance', 'transaction', 'balance',
    'voucher', 'loan', 'proof-of-life', 'security', 'api', 'copilot',
    'agentic', 'mcp', 'tool', 'authentication', 'fee', 'limit', 'tier',
  ];
  
  const lowerSection = sectionTitle.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerSection.includes(keyword) || lowerContent.includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  return [...new Set(tags)];
}

async function ingestFAQs(): Promise<DocumentChunk[]> {
  console.log('\n📋 Ingesting FAQs...');
  
  const faqs: DocumentChunk[] = [
    {
      id: 'faq-001',
      content: 'Q: How do I check my balance?\n\nA: You can check your balance by asking the Smartpay copilot "What is my balance?" or "Show me my wallet balance". Alternatively, you can use USSD by dialing your bank\'s USSD code (e.g., *140*321# for FNB).',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['balance', 'wallet', 'ussd'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-002',
      content: 'Q: What are the transaction limits?\n\nA: Transaction limits depend on your KYC verification tier:\n- Basic tier (phone verification): N$1,000 per day, N$5,000 balance limit\n- Intermediate tier (ID verification): N$5,000 per day, N$25,000 balance limit\n- Full tier (proof of address + biometric): N$50,000 per day, N$250,000 balance limit',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['limits', 'kyc', 'tier', 'compliance'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-003',
      content: 'Q: How do I cash out money?\n\nA: You can cash out using several methods:\n1. Agent cash-out: Find nearest agent, generate NAMQR QR code, show to agent\n2. Merchant cash-out: Use NAMQR at participating merchants\n3. ATM withdrawal: Use virtual card at supported ATMs\n4. Bank branch: Visit any partner bank branch with your phone\n\nAsk the copilot "Help me cash out" or "Find nearest agent" to get started.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['cashout', 'agent', 'namqr', 'atm'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-004',
      content: 'Q: How do I send money to someone?\n\nA: To send money, say "Send money to [name/phone]" or "Transfer N$[amount] to [recipient]". The copilot will:\n1. Verify the recipient\n2. Check your balance and limits\n3. Show transaction fee\n4. Ask for PIN confirmation\n5. Execute the transfer\n\nYou can also use USSD for offline money transfers.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['send', 'transfer', 'p2p', 'ussd'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-005',
      content: 'Q: What is NAMQR?\n\nA: NAMQR is the Namibian national QR code standard (v5.0) used for payments and cash-outs. It enables:\n- Interoperable payments between banks and wallets\n- Agent and merchant cash-outs\n- Quick peer-to-peer transfers\n- Bill payments\n\nSmartpay generates NAMQR codes for secure transactions.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['namqr', 'qr', 'payment', 'standard'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-006',
      content: 'Q: Can I use Smartpay without internet?\n\nA: Yes! Smartpay supports offline banking through USSD. Dial *140# (or your bank-specific code) on your phone to:\n- Check balance\n- Send money\n- Cash out\n- Buy airtime\n- Pay bills\n\nUSSD works on any mobile phone without internet connection. Standard SMS rates apply.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['ussd', 'offline', 'feature-phone'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-007',
      content: 'Q: What are the transaction fees?\n\nA: Transaction fees vary by type:\n- P2P transfers: Free for same-wallet transfers, N$2.50 for cross-wallet\n- Agent cash-out: 1.5% (min N$5, max N$50)\n- ATM withdrawal: N$10 flat fee\n- Bill payments: Free (merchants pay fees)\n- Airtime purchase: Free\n\nG2P grant disbursements are always free.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['fees', 'cost', 'pricing', 'g2p'],
      },
      createdAt: new Date(),
    },
    {
      id: 'faq-008',
      content: 'Q: How secure is Smartpay?\n\nA: Smartpay implements multiple security layers:\n- Bank of Namibia PSD-3 compliance\n- End-to-end encryption (TLS 1.3)\n- PIN + biometric authentication\n- Transaction limits and velocity checks\n- Real-time fraud detection\n- Audit logs for all operations\n- Device binding and app lock\n\nYour money is protected by Namibian banking regulations.',
      metadata: {
        source: 'FAQ',
        type: 'faq',
        tags: ['security', 'compliance', 'psd', 'encryption'],
      },
      createdAt: new Date(),
    },
  ];
  
  console.log(`✅ Created ${faqs.length} FAQ chunks`);
  return faqs;
}

async function ingestPolicies(): Promise<DocumentChunk[]> {
  console.log('\n📜 Ingesting policies and regulations...');
  
  const policies: DocumentChunk[] = [
    {
      id: 'policy-001',
      content: 'PSD-3 E-money Limits: All e-money transactions must comply with Bank of Namibia Position Paper Standard-3 (PSD-3) limits for balance and transaction amounts based on KYC verification tier. These limits ensure consumer protection and AML compliance.',
      metadata: {
        source: 'Bank of Namibia PSD-3',
        type: 'policy',
        tags: ['psd-3', 'compliance', 'limits', 'kyc'],
      },
      createdAt: new Date(),
    },
    {
      id: 'policy-002',
      content: 'KYC Requirements: Know Your Customer (KYC) verification is mandatory for all Smartpay users. Three tiers exist:\n- Basic: Phone number verification\n- Intermediate: ID document verification\n- Full: Proof of address + biometric verification\n\nHigher tiers enable higher transaction limits and additional features.',
      metadata: {
        source: 'Bank of Namibia Regulations',
        type: 'policy',
        tags: ['kyc', 'verification', 'compliance', 'identity'],
      },
      createdAt: new Date(),
    },
    {
      id: 'policy-003',
      content: 'Data Protection: Smartpay complies with Namibian Data Protection Act and GDPR principles. Personal data is encrypted, access-controlled, and used only for legitimate purposes. Users can request data deletion at any time.',
      metadata: {
        source: 'Data Protection Policy',
        type: 'policy',
        tags: ['privacy', 'gdpr', 'data-protection', 'compliance'],
      },
      createdAt: new Date(),
    },
    {
      id: 'policy-004',
      content: 'G2P Disbursement Rules: Government-to-Person (G2P) disbursements for social grants, pensions, and subsidies must:\n- Be traceable and auditable\n- Include proof-of-life verification for beneficiaries\n- Support agent-assisted cash-out for rural access\n- Comply with National Payment System rules\n- Provide SMS notifications for all transactions',
      metadata: {
        source: 'NPS G2P Guidelines',
        type: 'policy',
        tags: ['g2p', 'grants', 'pension', 'proof-of-life', 'compliance'],
      },
      createdAt: new Date(),
    },
    {
      id: 'policy-005',
      content: 'NAMQR Standard Compliance: All QR code transactions must use NAMQR v5.0 standard as defined by the National Payment System. This ensures interoperability across Namibian banks, wallets, and payment systems.',
      metadata: {
        source: 'NPS NAMQR Standard',
        type: 'policy',
        tags: ['namqr', 'qr', 'standard', 'interoperability'],
      },
      createdAt: new Date(),
    },
  ];
  
  console.log(`✅ Created ${policies.length} policy chunks`);
  return policies;
}

async function main() {
  console.log('🚀 Starting Smartpay Knowledge Base Ingestion...\n');
  console.log('This will ingest PRD documents, FAQs, and policies into LanceDB');
  console.log('for semantic search in the copilot.\n');
  
  try {
    const db = await initLanceDB();
    console.log('✅ LanceDB connection established\n');
    
    const prdChunks = await ingestPRDDocument();
    const faqChunks = await ingestFAQs();
    const policyChunks = await ingestPolicies();
    
    const allChunks = [...prdChunks, ...faqChunks, ...policyChunks];
    
    console.log(`\n📊 Total chunks to ingest: ${allChunks.length}`);
    console.log(`  - PRD chunks: ${prdChunks.length}`);
    console.log(`  - FAQ chunks: ${faqChunks.length}`);
    console.log(`  - Policy chunks: ${policyChunks.length}`);
    
    if (allChunks.length === 0) {
      console.log('⚠️  No chunks to ingest. Exiting.');
      return;
    }
    
    console.log('\n⏳ Generating embeddings and storing in LanceDB...');
    console.log('   (This may take a minute depending on chunk count)\n');
    
    await db.ingest(allChunks);
    
    console.log('\n✅ Knowledge base ingestion complete!\n');
    console.log('📈 Statistics:');
    console.log(`  - Total documents ingested: ${allChunks.length}`);
    console.log(`  - Embedding model: text-embedding-3-small (1536 dimensions)`);
    console.log(`  - Storage: ${process.env.LANCEDB_PATH || './data/lancedb'}`);
    
    console.log('\n🧪 Testing search...');
    const testResults = await db.search('How do I cash out money?', 3);
    console.log(`  Found ${testResults.length} results for test query`);
    
    if (testResults.length > 0) {
      console.log('\n  Top result:');
      console.log(`  - Content: ${testResults[0].chunk.content.substring(0, 100)}...`);
      console.log(`  - Score: ${testResults[0].score.toFixed(4)}`);
      console.log(`  - Source: ${testResults[0].chunk.metadata.source}`);
    }
    
    console.log('\n✨ Ready to use! The copilot can now search the knowledge base.\n');
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as ingestKnowledgeBase };
